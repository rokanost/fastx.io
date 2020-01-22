import io from "socket.io-client";

try 
{
  console.log("Connecting to insight.litecore.io (LTC) ...");

  let socket = io("https://insight.litecore.io/", {
    reconnectionDelay: 5000,
    randomizationFactor: 1
  });

  socket.on('connect', function() {
    console.log("LTC: Connection established.");
    socket.emit('subscribe', 'inv');
  });

  socket.on('tx', Meteor.bindEnvironment((tx) => {
    if(activeConversions.find({input_code: "LTC", status_id: 1}).count() > 0) {
      tx.vout.forEach((o) => {
        let addrTo = Object.keys(o)[0]; // recipient address
        let conversion = activeConversions.findOne({input_code: "LTC", crypto_address: addrTo, status_id: 1});
        if(conversion)
        {
          let amount = fromSatoshiToAmount(Object.values(o)[0]); // amount received (not confirmed)
          // Update wallet balance
          queryLiveDb(`UPDATE wallet_info SET pending_balance = pending_balance + ? WHERE id = ?`, [amount, conversion.wallet_id]);
          // Change conversion status
          if(conversion.is_precise) 
          {
            // Precise
            let q = queryLiveDb(`SELECT pending_balance FROM wallet_info WHERE id = ?`, [conversion.wallet_id]);
            if(q.length && q[0].pending_balance >= conversion.input_amount) {
              // Update state if tx amount is enough to continue
              queryLiveDb(`UPDATE conversions SET status_id = 2 WHERE id = ?`, [conversion.id]);
            }
          } 
            else 
          {
            // Quick
            queryLiveDb(
              `UPDATE conversions 
                SET input_amount = ?, output_amount = ?, status_id = 2 
              WHERE id = ?`, 
              [amount, toDecimalByTypeId(amount * conversion.rate, conversion.type_id), conversion.id]
            );
          }
        }
      });
    }
  }));

  socket.on('disconnect', function(d) {
    console.log('LTC: disconnect!', d)
  });

  socket.on('error', function(e) {
    console.log('LTC: error!', e.message)
  });

} catch(e) {
  console.log(e);
}