Meteor.methods({

    getImageVector() 
    {
        if(!isAdmin(this.userId)) throw new Meteor.Error("isAdmin","Access-denied");        
        return Meteor.settings.private.IMAGE_VECTOR;
    },

    markAsCompletedManually({conversion_uuid}) 
    {
        check(conversion_uuid, uuidCheck);
        if(!isAdmin(this.userId)) throw new Meteor.Error("isAdmin","Access-denied");
        
        let c = queryLiveDb('SELECT id FROM conversions WHERE uuid = ?', [conversion_uuid]);
        if(c && c.length > 0)
        {
            let id = c[0].id

            // output_aud_rate_at_the_time
            let q4 = queryLiveDb(
                `SELECT rate_without_fee FROM conversion_rates 
                    WHERE code_from = ? AND code_to = ?`,
                [conversion.output_code, "AUD"]
            );

            let output_aud_rate_at_the_time = null;
            if(q4) output_aud_rate_at_the_time = q4[0].rate_without_fee;

            let q = queryLiveDb(
                `UPDATE conversions SET output_sent_datetime = NOW(), output_aud_rate_at_the_time = ? 
                    WHERE output_sent_datetime IS NULL AND id = ?`, 
                [output_aud_rate_at_the_time, id]
            );
    
            if(q && q.affectedRows > 0)
            {
                emailConversionStatusUpdate(id);
                return "Success, conversion marked as manually completed!";
            }
        }
        throw new Meteor.Error("error", "Failed to complete, this conversion might have been marked already.");
    },

    releaseConversionOutput({conversion_uuid}) {
        /* 
          Complete conversion
        */
       check(conversion_uuid, uuidCheck);
    
        if(!isAdmin(this.userId) && this.connection) 
          throw new Meteor.Error("isAdmin","Access-denied");
      
        let conversion = queryLiveDb(
          `SELECT 
            id, uuid, output_amount, output_code, type_id, output_prepared_datetime
            FROM conversions
              WHERE
              output_process_started_datetime IS NULL AND
              output_sent_datetime IS NULL AND
              status_id = 3 AND
              uuid = ?`, [conversion_uuid]
        );
    
        // Conversion not found
        let c = conversion[0];
        if(!c) throw new Meteor.Error("error", "Payment failed");
    
        try {
    
          // Start Preparation Process if not prepared yet
          if(!c.output_prepared_datetime) 
          {
            // Prepare a conversion...
            // Get rates ordered by lowest asking price
            let q_exchange_rates = queryLiveDb(
              `SELECT
                bid_price, ask_price, code_from, code_to, exchange exchange_name
              FROM exchange_rates 
                ORDER BY ask_price`
            );
            // Get balances
            let q_balances = queryLiveDb(
              `SELECT balance, currency_code, exchange_name 
                FROM exchange_balances
              ORDER BY balance DESC`
            );
    
            switch (c.type_id) {
              case 1: // c/f
              case 4: // f/f
                // TODO: check bank balance
              break;
            
              case 2: // c/c
              case 3: // f/c   
        
                refillBalance = () => {                 
                  // Find exchange we can buy output on
                  let available_markets = _.filter(q_exchange_rates, er => {
                    return er.code_from === c.output_code
                  });
                  
                  // TODO: make all of these options dynamic later on
    
                  // Option 1:
                  // Buy with AUD on btcmarkets
                  let exchange_rate = _.find(available_markets, er => {
                    return er.exchange_name === "btcmarkets" && er.code_to === "AUD"
                  });
    
                  if(!exchange_rate) {
                    // Option 2:
                    // Buy with USDT on binance
                    exchange_rate = _.find(available_markets, er => {
                      return er.exchange_name === "binance" && er.code_to === "USDT"
                    });
                  }
    
                  if(!exchange_rate) {
                    // Option 3:
                    // Buy BTC using USDT on binance..
                    // Get BTC/USDT rate
                    let r = _.find(q_exchange_rates, er => {
                      return er.exchange_name === "binance" && er.code_from === "BTC" && er.code_to === "USDT"
                    });
                    // Get OUTPUT_CODE/BTC rate
                    exchange_rate = _.find(available_markets, er => {
                      return er.exchange_name === "binance" && er.code_to === "BTC"
                    });
                    // Buy required amount of BTC
                    createLimitBuyOrder({
                      pair: "BTC/USDT", 
                      // Calc how much BTC we need to later purchase enough output_code + 1%
                      amount: c.output_amount * exchange_rate.ask_price * 1.01, 
                      price: r.ask_price, 
                      exchange: "binance"
                    });
                    // Give it some time to fill the buy order
                    Promise.await(delay(SETTINGS.order_fill_up_seconds*1000));
                  }

                  let q_fees = queryLiveDb(
                    `SELECT exchange_name, amount 
                        FROM exchange_fees ef
                    JOIN exchange_balances eb 
                        ON currency_code = code AND exchange_name = exchange
                    WHERE code = ? 
                        ORDER BY amount LIMIT 1`, 
                    [c.output_code]
                  );

                  if(!q_fees.length) 
                  throw "Couldn't find a withdrawal fee";
                
                  // output amount + fee amount
                  let amount = c.output_amount + q_fees[0].amount;
    
                  // Purchase required amount
                  createLimitBuyOrder({
                    pair: c.output_code+"/"+exchange_rate.code_to, 
                    amount,
                    price: exchange_rate.ask_price, 
                    exchange: exchange_rate.exchange_name
                  });
          
                  // Give it X seconds for buy order to fill up our balance
                  Promise.await(delay(SETTINGS.order_fill_up_seconds*1000));
                }
                
                // Check if we got enough crypto
                let balances_of_output = _.filter(q_balances, b => b.currency_code === c.output_code);
                // Not enough balance to complete?
                if(!_.find(balances_of_output, b => b.balance >= c.output_amount)) 
                {
                  // Refill with block
                  refillBalance();
                }
                  else 
                {
                  // We've got enough, refill anyways without blocking the release..
                  // Required as we might want to keep our crypto on exchanges
                  Meteor.defer(() => {
                    refillBalance();
                  });
                }

              break;
            }

            // Mark as prepared 
            queryLiveDb(
              `UPDATE conversions SET output_prepared_datetime = NOW() WHERE id = ?`, [c.id]
            );
          }
    
          // Release output
          Meteor.call("releasePayment", {conversion_uuid: c.uuid});
    
        } catch(e) {
            //TODO: if failed, prevent from running again setting failed time as it could spent all balances

          console.log("releaseConversionOutput: #"+c.id, e);
          Meteor.call("sendEmail",{
            name:"AUTOPAY",
            email:"support@fastx.io",
            subject:"Error in releaseConversionOutput #"+c.id,
            message: JSON.stringify(e)
          });
          throw new Meteor.Error("failure", "Payment has failed:", e);
        }
    
        return true;
    },

    releasePayment({conversion_uuid}) 
    { 
        check(conversion_uuid, uuidCheck);
        if(!isAdmin(this.userId) && this.connection) throw new Meteor.Error("isAdmin","Access-denied");

        let result;
        try 
        {
            // Select unpaid conversion
            let q = queryLiveDb(
                `SELECT 
                    id, type_id, tag, status_id, output_info_id, 
                    output_code, output_amount, output_sent_datetime,
                    output_process_started_datetime
                FROM conversions 
                    WHERE uuid = ?`, [conversion_uuid]
            );
            
            if(!q.length) throw "Conversion not found";
            let conversion = q[0];

            if(conversion.status_id < 3)
                throw "This conversion can't be paid (funds haven't been confirmed yet)";
            
            if(conversion.output_process_started_datetime)
                throw "Process already started...";

            if(conversion.output_sent_datetime)
                throw "This conversion has been paid already!";

            // Start Process
            queryLiveDb(
                `UPDATE conversions SET output_process_started_datetime = NOW() WHERE id = ?`, 
                [conversion.id]
            );

            // Different process types
            if([1,4].indexOf(conversion.type_id) > -1) 
            {
                // ======== C/F & F/F =============
                // Send fiat to customer's bank
                // TODO: puppet can only handle one of the same type payment at once
                // it has to finish previous payment or it will fail
                let qq = queryLiveDb(`SELECT * FROM bank_info WHERE id = ?`, [conversion.output_info_id]);
                if(qq[0].payid) 
                {
                  // PayID  
                  if(!puppet.browser)
                    puppet.initBrowser();
          
                  // Check if already logged in
                  if(!anz.loggedIn) 
                      anz.login();

                  result = anz.newPayment({
                    conversion_id: conversion.id,
                    mobile: qq[0].payid,
                    amount: conversion.output_amount
                  });
                } 
                  else 
                {
                  // Bank & BPAY
                  result = stgeorge.initBankPaymentPuppet(conversion_uuid);
                }
            } 
            else if([2,3].indexOf(conversion.type_id) > -1) 
            {
                // ======== C/C & F/C =============
                // Send funds to customer's wallet from an exchange
                // Select output wallet address
                let q2 = queryLiveDb(
                    `SELECT crypto_address FROM wallet_info WHERE id = ?`, 
                    [conversion.output_info_id]
                );

                if(!q2.length) 
                    throw "Output wallet not found";

                let q3 = queryLiveDb(
                    `SELECT exchange_name, amount 
                        FROM exchange_fees ef
                    JOIN exchange_balances eb 
                        ON currency_code = code AND exchange_name = exchange
                    WHERE code = ? 
                        ORDER BY amount LIMIT 1`, 
                    [conversion.output_code]
                );

                if(!q3.length) 
                    throw "Couldn't find a withdrawal fee";
                
                 // output amount + fee amount
                let amount = conversion.output_amount + q3[0].amount;
                let exchange = q3[0].exchange_name;
            
                if(exchange === "btcmarkets") 
                {
                    result = Promise.await(exchanges["btcmarkets"].privatePostFundtransferWithdrawCrypto({
                        currency: conversion.output_code,
                        amount: amount*100000000,
                        address: q2[0].crypto_address
                    }));
                } 
                else 
                {
                    result = withdrawFromExchange({
                        exchange,
                        amount,
                        code: conversion.output_code, 
                        address: q2[0].crypto_address
                    });
                }
            }

            // Mark conversion as Completed
            if(result) 
            {
                // output_aud_rate_at_the_time
                let q4 = queryLiveDb(
                    `SELECT rate_without_fee FROM conversion_rates 
                        WHERE code_from = ? AND code_to = ?`,
                    [conversion.output_code, "AUD"]
                );

                let output_aud_rate_at_the_time = null;
                if(q4.length) output_aud_rate_at_the_time = q4[0].rate_without_fee;

                queryLiveDb(`UPDATE conversions 
                    SET output_sent_datetime = NOW(), output_aud_rate_at_the_time = ? WHERE id = ?`, 
                    [output_aud_rate_at_the_time, conversion.id]
                );
                
                emailConversionStatusUpdate(conversion.id);   

                return result;

            } else {

              // Something wrong...
              throw "releasePayment error: #"+conversion.id+": "+JSON.stringify(result);
            }

        } catch(e) {
            // Error
            console.log(e);
            throw new Meteor.Error("error", e.message);
        }
    }
})