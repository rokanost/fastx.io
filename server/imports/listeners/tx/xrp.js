import { RippleAPI } from 'ripple-lib';

try 
{
  let server = 'wss://s2.ripple.com'
  XRP_api = new RippleAPI({
    server: server // Public rippled server
  });

  console.log("Connecting to "+server+" (XRP) ...");

  XRP_api.connect().then(() => {
    console.log("XRP: Connection established.");

    // LISTEN FOR INCOMING XRP TRANSACTIONS
    XRP_api.connection.on('transaction', Meteor.bindEnvironment((tx) => {
      if(tx.validated && tx.engine_result === "tesSUCCESS")
      {
        let conversion = activeConversions.findOne({
          input_code: "XRP",
          crypto_address: tx.transaction.Destination,
          tag: parseInt(tx.transaction.DestinationTag),
          status_id: 1
        });

        if(conversion)
        {
          let amount = fromXRPToAmount(parseInt(tx.transaction.Amount));
          // Update wallet balance
          queryLiveDb(
            `UPDATE wallet_info SET pending_balance = pending_balance + ?, confirmed_balance = confirmed_balance + ? WHERE id = ?`, 
            [amount, amount, conversion.wallet_id]
          );
          // Change conversion status
          if(conversion.is_precise) 
          {
            // Precise
            let q = queryLiveDb(`SELECT confirmed_balance FROM wallet_info WHERE id = ?`, [conversion.wallet_id]);
            if(q.length && q[0].confirmed_balance >= conversion.input_amount) {
              // Update state if tx amount is enough to continue
              queryLiveDb(`UPDATE conversions SET status_id = 3 WHERE id = ?`, [conversion.id]);
            } else {
              // Stop further process, prevents from sending an email if only partial amount received
              return;
            }
          } 
            else 
          {
            // Quick
            queryLiveDb(
              `UPDATE conversions 
                SET input_amount = ?, output_amount = ?, status_id = 3 
              WHERE id = ?`, 
              [amount, toDecimalByTypeId(amount * conversion.rate, conversion.type_id), conversion.id]
            );
          }
          // Send notifications
          emailConversionStatusUpdate(conversion.id);
        }
      }
    }));

    return XRP_api.connection.request({
      command: 'subscribe',
      accounts: [RIPPLE_ADDRESS]
    });

  });

} catch(e) {
  console.log(e);
}