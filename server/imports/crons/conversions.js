import { prepareTx } from "../modules/conversions.js";
import crypto from "../modules/crypto.js";
import providers from "../providers.js";
import * as nanoCurrency from 'nanocurrency';

// THE FOLLOWING FUNCTIONS RUN PERIODICALLY TO CHECK FOR TRANSACTIONS THAT THE LISTENERS MAY HAVE MISSED (server was down etc)
// BTC/LTC/ETH/BCH
SyncedCron.add({
  name: 'checkPendingConversions',
  schedule: function(parser) {
	   return parser.text('every 1 minute');
  },
  job: function() {
    if(!!SETTINGS['maintenance']) return false;

    let cryptos = ["BTC", "LTC", "ETH", "BCH"];
    _.each(activeConversions.find({input_code: {$in: cryptos}, status_id: 1}).fetch(), conversion => {
        try
        {
          let amount = providers[conversion.input_code].getBalance(conversion.crypto_address, true); // true, to include pending balance
          // Update amount received only if more than 0
          if(amount && amount > 0)
          {
            // Update wallet balance
            queryLiveDb(`UPDATE wallet_info SET pending_balance = ? WHERE id = ?`, [amount, conversion.wallet_id]);
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
        } catch(e) {
          console.log('FAILED: checkPendingConversions: ' + e)
        }
        // Add 2s delay between API calls
        Promise.await(delay(2000));
    });
    return true;
  }
});

SyncedCron.add({
  name: 'checkConversionsNANO',
  schedule: function(parser) {
	   return parser.text('every 10 seconds');
  },
  job: function() {

      let conversions = activeConversions.find({input_code: "NANO", status_id: 1}).fetch();
      if(!conversions.length) return true;

      _.each(conversions, conversion => {
        try 
        {
          let pending_blocks = providers.NANO.getPendingBlocks(conversion.crypto_address, 999, true);
          let pending_hashes = Object.keys(pending_blocks);
          if(!pending_hashes.length) {
            //console.log("NANO: couldnt find pending blocks #"+conversion.id);
            return;
          }
          // Include pending
          let amount = providers.NANO.getBalance(conversion.crypto_address, true);
          // TODO: have min check amount for each
          if(amount <= 0) {
            console.log("NANO: wallet amount is too low #"+conversion.id);
            return;
          }
          // Update wallet
          queryLiveDb(
            `UPDATE wallet_info SET pending_balance = ? WHERE id = ?`, 
            [amount, conversion.wallet_id]
          );
          // Change conversion status
          if(conversion.is_precise)
          {
            // Precise
            if(amount >= conversion.input_amount) {
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

          let secretKey = getPrivateKey({id: conversion.wallet_id, crypto_code: "NANO"});
          let publicKey = nanoCurrency.derivePublicKey(conversion.crypto_address);
          
          let publishedBlock; 
          // Claim pending blocks
          _.each(pending_blocks, (pb, hash) => {
            let account_info, previous, work, balance;
            console.log("NANO: Claiming state block...")
            try {
              // Check if the account has been created already..
              account_info = providers.NANO.getAccountInfo(conversion.crypto_address);
            } catch(e) {
              // Create new account..
            }
            // If acccount is not opened yet
            if(!account_info) 
            {
              previous = "0000000000000000000000000000000000000000000000000000000000000000";
              work = providers.NANO.work(publicKey);
              balance = pb.amount;
            } else {
              // Acc has been opened
              previous = account_info.frontier;
              work = providers.NANO.work(previous);   
              balance = fromNanoToRaw(fromRawToNano(account_info.balance)+fromRawToNano(pb.amount));
            }
  
            let newBlock = nanoCurrency.createBlock(secretKey, {
              balance,
              work,
              link: hash,
              previous,
              representative: NANO_REPRESENTATIVE
            });
            // Publish a block
            publishedBlock = providers.NANO.publish(newBlock.block);
            if(!publishedBlock) 
              throw "NANO: failed to publish a block for conversion #"+conversion.id;
            
            console.log("NANO: block claimed");
          });

          // Update wallet balance
          queryLiveDb(
            `UPDATE wallet_info SET pending_balance = 0, confirmed_balance = ? WHERE id = ?`,
            [amount, conversion.wallet_id]
          );
          // Change conversion status
          queryLiveDb(`UPDATE conversions SET status_id = 3 WHERE id = ?`, [conversion.id]);
          

          console.log('NANO: Create a send block...');
          let work = providers.NANO.work(publishedBlock);
          let sendBlock = nanoCurrency.createBlock(secretKey, {
            balance: "0",
            work,
            previous: publishedBlock,
            link: "xrb_3rcaqfmnai33him7t8hokqjyi4mm5uwfs8edw5x5kwknrybdaoigybqffk6r", // Binance
            representative: NANO_REPRESENTATIVE
          });

          // Publish send block
          let publishedSendBlock = providers.NANO.publish(sendBlock.block);
          if(!publishedSendBlock) {
            console.log("NANO: failed to publish send block for conversion #"+conversion.id);
            return;
          }
          console.log("NANO: Success, funds sent to exchange");

          // Completed
          // Update wallet balance
          queryLiveDb(`UPDATE wallet_info SET confirmed_balance = 0 WHERE id = ?`, [conversion.wallet_id]);

          // Change conversion status
          queryLiveDb(
            `UPDATE conversions SET input_amount_sent_to_exchange = ?, exchange_name = ? WHERE id = ?`, 
            [amount, "binance", conversion.id]
          );

          // Send notifications
          emailConversionStatusUpdate(conversion.id);
        } catch(er) {
          console.log("NANO error:", er);
        }
        // Add 1s delay between API calls
        Promise.await(delay(1000))
      });

      return true;
  }
});

// XRP (if detected, it's confirmed)
SyncedCron.add({
  name: 'checkConversionsXRP',
  schedule: function(parser) {
	   return parser.text('every 30 seconds');
  },
  job: function() {
    if(!!SETTINGS['maintenance']) return false;

    try 
    {
      let conversions = activeConversions.find({input_code: "XRP", status_id: 1}).fetch();
      if(!conversions.length) return true;

      // Get all TX (all txs for XRP in one address)
      let txs = providers.XRP.getTransactions(RIPPLE_ADDRESS);
      _.each(conversions, conversion => {
          let amount = providers.XRP.calculateTagBalance(RIPPLE_ADDRESS, conversion.tag, txs);
          if(amount > 0) {
            // Update wallet balance
            queryLiveDb(
              `UPDATE wallet_info SET pending_balance = ?, confirmed_balance = ? WHERE id = ?`, 
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
      });
    } catch(e) {
      console.log('FAILED: checkConversionsXRP: ' + e)
    }
    return true;
  }
});


// Get confirmed balances ETH/BTC/LTC
SyncedCron.add({
  name: 'checkConversions',
  schedule: function(parser) {
	   return parser.text('every 30 seconds');
  },
  job: function() {
    if(!!SETTINGS['maintenance']) return false;
    // Conversions where transfer was detected
    let q_conversions = queryLiveDb(
      `SELECT
          c.id, wi.id wallet_id, crypto_address, crypto_code, 
          is_precise, type_id, input_amount,
          ROUND(1 / input_amount * output_amount, 2) as rate
      FROM conversions c
        JOIN wallet_info wi ON wi.id = c.input_info_id
      WHERE
        status_id = 2 AND
        type_id IN (1,2) AND
        crypto_code IN ("BTC", "LTC", "ETH", "BCH")`
    );

    if(q_conversions && q_conversions.length > 0)
    {
      let conversions_grouped = _.groupBy(q_conversions, 'crypto_code');
      _.each(conversions_grouped, (conversions, crypto_code) => {

        switch (crypto_code) {

          case "ETH":

            let chunks = chunk(conversions, 20);
            _.each(chunks, chunk => {
              try {
                // Get multiple balances
                let balances = crypto.getBalances({
                  crypto_code,
                  crypto_addresses: chunk.map(c => c.crypto_address)
                });
                // Update amount received only if more than 0
                _.each(balances, (b) => {
                  let amount = b.amount;
                  if(amount && amount > 0)
                  {
                    let conversion = chunk.find(c => c.crypto_address === b.address);
                    queryLiveDb(
                      `UPDATE wallet_info SET confirmed_balance = ? WHERE id = ?`,
                      [amount, conversion.wallet_id]
                    );
                    // Change conversion status
                    if(conversion.is_precise)
                    {
                      // Precise
                      if(amount >= conversion.input_amount) {
                        // Update state if tx amount is enough to continue
                        queryLiveDb(`UPDATE conversions SET status_id = 3 WHERE id = ?`, [conversion.id]);
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
                });
              } catch(er) {
                console.log(er)
              }
              // Add 2s delay between API calls
              Promise.await(delay(2000))
            });
          break;


          case "BTC":
          case "LTC":
          case "BCH":

            _.each(conversions, conversion => {
              try {
                // Get balance
                let amount = crypto.getBalance({
                  crypto_code,
                  crypto_address: conversion.crypto_address
                });
                // Update amount received only if more than 0
                if(amount && amount > 0)
                {
                  queryLiveDb(
                    `UPDATE wallet_info SET confirmed_balance = ? WHERE id = ?`,
                    [amount, conversion.wallet_id]
                  );
                  // Change conversion status
                  if(conversion.is_precise)
                  {
                    // Precise
                    if(amount >= conversion.input_amount) {
                      // Update state if tx amount is enough to continue
                      queryLiveDb(`UPDATE conversions SET status_id = 3 WHERE id = ?`, [conversion.id]);
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
              } catch(er) {
                console.log(er)
              }
              // Add 2s delay between API calls
              Promise.await(delay(2000))
            });
          break;
        }

      });
    }

    return true;
  }
});


// Transfer crypto to the best exchange
SyncedCron.add({
  name: 'transferCryptoToExchange',
  schedule: function(parser) {
	   return parser.text('every 2 minutes');
  },
  job: function() {
    if(!!SETTINGS['maintenance']) return false;
    Meteor.call("transferCryptoToExchange");
    return true;
  }
});

// Create sell orders on exchange to sell crypto
SyncedCron.add({
  name: 'sellCryptoFromConversionsOnExchange',
  schedule: function(parser) {
	   return parser.text('every 35 seconds');
  },
  job: function() {
    if(!!SETTINGS['maintenance']) return false;
    // Conversions where transfer to exchange has been completed
    // TODO:
    // 1) update the rates before we run this
    let q_conversions = queryLiveDb(
      `SELECT
          id,
          input_code,
          input_amount_sent_to_exchange,
          exchange_name
        FROM
            conversions c
        WHERE
          type_id IN(1,2) AND
          input_amount_sent_to_exchange IS NOT NULL AND
          sell_order_price IS NULL`
    );

    // Stop process if no conversions found
    if(!q_conversions.length) return true;

    let q_exchange_balances = queryLiveDb(`SELECT
        balance, currency_code, exchange_name, exchange_wallet_address
      FROM exchange_balances`,
    );

    let q_exchange_rates = queryLiveDb(
      `SELECT
        bid_price, ask_price, code_from, code_to, exchange
      FROM exchange_rates`
    );

    _.each(q_conversions, (c) => {
      try
      {
        let sell_order_codes = [
          "AUD", // covert to AUD (priority 1)
          "USDT", // convert to USDT (priority 2)
          "BTC", // covert to BTC (priority 3)
          "ETH" // covert to ETH (priority 4)
        ];

        let exchange_rate;
        _.each(sell_order_codes, code => {
          // Do not search, if already assigned
          if(exchange_rate) return;
          // Find a bid price
          exchange_rate = _.find(q_exchange_rates, er => {
            return (
                er.code_from === c.input_code &&
                er.code_to === code &&
                er.exchange === c.exchange_name
            )
          });
        });

        if(!exchange_rate) throw "Exchange rate not found #" + c.id;

        let exchange = _.find(q_exchange_balances, ex => {
          return ex.currency_code === c.input_code && ex.exchange_name === c.exchange_name
        });

        if(!exchange) throw "Failed to get exchange balance #" + c.id;

        if(c.input_amount_sent_to_exchange > exchange.balance)
          return; //throw "Not enough balance to place sell order #" + c.id;

        let params = {
            pair:     c.input_code+"/"+exchange_rate.code_to,
            amount:   c.input_amount_sent_to_exchange,
            price:    exchange_rate.bid_price,
            exchange: c.exchange_name
        };

        let sell = createLimitSellOrder(params);
        console.log(sell);

        if(sell)
        {
          queryLiveDb(
            `UPDATE conversions SET sell_order_price = ?, sell_order_code_to = ? WHERE id = ?`,
            [exchange_rate.bid_price, exchange_rate.code_to, c.id]
          );
        }
        // Add 2s delay between API calls
        Promise.await(delay(2000))
      } catch(e) {
        console.log('FAILED: sellCryptoFromConversionsOnExchange: ' + e)
      }
    });

    return true;
  }
});

// Update rates for conversions
SyncedCron.add({
  name: 'updateConversionRates',
  schedule: function(parser) {
	   return parser.text('every 1 minute');
  },
  job: function() {
    if(!!SETTINGS['maintenance']) return false;
    Meteor.call("updateConversionRates");
    return true;
  }
});


SyncedCron.add({
  name: 'expiredConversions',
  schedule: function(parser) {
	   return parser.text('every 1 minute');
  },
  job: function() {
    if(!!SETTINGS['maintenance']) return false;
    // Cancell conversions that haven't detected anything
    queryLiveDb(
      `UPDATE conversions c
        JOIN wallet_info wi ON c.input_info_id = wi.id
          SET status_id = 0
        WHERE
          status_id = 1 AND
          type_id IN (1,2) AND
          pending_balance = 0 AND
          confirmed_balance = 0 AND
          datetime < NOW() - INTERVAL ? SECOND`,
      [CONVERSION_EXPIRE_SECONDS]
    );

    return true;
  }
});


SyncedCron.add({
  name: 'releaseConversionOutput',
  schedule: function(parser) {
	   return parser.text('every 1 minute');
  },
  job: function() {
    if(!!SETTINGS['maintenance'] || !SETTINGS.automated_payouts) return false;

    let conversions = queryLiveDb(`SELECT uuid FROM conversions WHERE
      output_process_started_datetime IS NULL AND
      output_sent_datetime IS NULL AND
      status_id = 3`);
      
    _.each(conversions, c => {
      Meteor.call("releaseConversionOutput", {
        conversion_uuid: c.uuid
      });
    });
    
    return true;
  }
});





Meteor.methods({
  updateConversionRates() {
    // Conversions where transfer has not been detected yet
    // Conditional decimal ROUND() for crypto(8) and fiat(2) outputs
    // Conversions where 5 minutes from creation has passed
    queryLiveDb(
      `UPDATE conversions c,
        (SELECT
          id, type_id, input_code, input_amount, output_code, output_amount
        FROM conversions
        WHERE
          status_id = 1 AND
          datetime < NOW() - INTERVAL 5 MINUTE 
        ) src
      SET
  		# update output amount if not precise
  		c.output_amount = IF(is_precise, src.output_amount, (
            SELECT    
              ROUND(src.input_amount * rate, IF(src.type_id IN(1,4),2,8))
            FROM conversion_rates
            WHERE
              code_from = src.input_code AND
              code_to = src.output_code
            )),
  		# update input amount if precise
  		c.input_amount = IF(!is_precise, src.input_amount, (
            SELECT
              ROUND(src.output_amount / rate, IF(src.type_id IN(3,4),2,8))
            FROM conversion_rates
            WHERE
              code_from = src.input_code
              AND code_to = src.output_code
  		  ))
        WHERE c.id = src.id`
    );
  },
  
  transferCryptoToExchange() {
      // Conversions where crypto received and not sent to exchange yet
      let q_conversions = queryLiveDb(
        `SELECT
          c.id, wi.id wallet_id, confirmed_balance, crypto_address, crypto_code
        FROM conversions c
          JOIN wallet_info wi ON wi.id = c.input_info_id
        WHERE
          type_id IN(1,2) AND
          input_amount_sent_to_exchange IS NULL AND
          status_id = 3`
      );
  
      let q_exchange_balances = queryLiveDb(`SELECT 
          currency_code, exchange_name, exchange_wallet_address, tag
        FROM exchange_balances`
      );
  
      if(q_conversions.length && q_exchange_balances.length)
      {

        let conversions_grouped = _.groupBy(q_conversions, 'crypto_code');
        _.each(conversions_grouped, (conversions, crypto_code) => {
  
          // Find the exchange for crypto tx
          let exchange = _.find(q_exchange_balances, c => {
            // TODO: Only sends to btcmarkets for now, once c/c is enabled, 
            // route other coins that are not found on btcmarkets to binance as priority 2
            return c.currency_code === crypto_code && c.exchange_name === "btcmarkets" && c.exchange_wallet_address
          });

          if(!exchange) {
            console.log("ERROR: transferCryptoToExchange: Please assign wallet to "+crypto_code)
            return;
          }

          switch (crypto_code)
          {
            case "BTC":
            case "LTC":
  
                try
                {
                  let tx = prepareTx({
                    crypto_code,
                    conversions: conversions.map(c => c.id),
                    to: exchange.exchange_wallet_address
                  });
  
                  providers[crypto_code].pushTx(tx.hex);
  
                  // Update conversions
                  _.each(conversions, (c, i) => {
                    // Apply fee only once
                    queryLiveDb(
                      `UPDATE conversions SET input_amount_sent_to_exchange = ?, exchange_name = ? WHERE id = ?`,
                      [(i === 0 ? c.confirmed_balance - tx.fee : c.confirmed_balance), exchange.exchange_name, c.id]
                    );
                    queryLiveDb(
                      `UPDATE wallet_info SET confirmed_balance = 0 WHERE id = ?`,
                      [c.wallet_id]
                    );
                  });
                  // Success
                  console.log("SUCCESS: "+crypto_code+" SENT FROM CONVERSIONS -> EXCHANGE");
                } catch(er) {
                  // Failure
                  console.log("ERROR: "+crypto_code+" transferCryptoToExchange: ",er);
                }
            break;


            case "BCH":
              _.each(conversions, c => {
                try
                {
                  let fee = 515; // static fee in satoshi
                  // TODO: fix decimal functions and do not use round()
                  let value = Math.round(fromAmountToSatoshi(c.confirmed_balance) - fee);
                  
                  let raw = wallets[crypto_code].tx({
                    id: c.wallet_id, 
                    value, 
                    fee, 
                    to: exchange.exchange_wallet_address
                  });

                  providers[crypto_code].pushTx(raw);
  
                  queryLiveDb(
                    `UPDATE conversions SET input_amount_sent_to_exchange = ?, exchange_name = ? WHERE id = ?`,
                    [fromSatoshiToAmount(value), exchange.exchange_name, c.id]
                  );
                  queryLiveDb(
                    `UPDATE wallet_info SET confirmed_balance = 0 WHERE id = ?`,
                    [c.wallet_id]
                  );
 
                  // Success
                  console.log("SUCCESS: "+crypto_code+" SENT FROM CONVERSIONS -> EXCHANGE");
                } catch(er) {
                  // Failure
                  console.log("ERROR: "+crypto_code+" transferCryptoToExchange: ",er);
                }
              });
            break;

  
            // Send one by one
            case "ETH":
  
              let gasPrice = 10000000000; // (10 Gwei); //providers.ETH.getGasPrice();
              let gasLimit = 21000; // Normally its 21000, but "acx" smart contract requires 21039.
  
              _.each(conversions, conversion => {
                try
                {

                  let privateKey = getPrivateKey({
                    id: conversion.wallet_id,
                    crypto_code
                  });
  
                  let fee = (gasLimit*gasPrice);
                  let value = fromAmountToWei(conversion.confirmed_balance);
                  if(value == 0)
                    return;
  
                  if(fee >= value) throw "Fee ("+fee+") is higher than value ("+value+")";
                  if(!exchange.exchange_wallet_address) throw "Exchange address not provided";
  
                  let tx = crypto.txETH({
                    nonce: 0, // Always 0 because it's first TX from address
                    value: (value - fee),
                    to: exchange.exchange_wallet_address,
                    privateKey: privateKey,
                    gasPrice,
                    gasLimit
                  });
  
                  let res = providers.ETH.pushTx(tx);
                  if(res.error) throw res.error
  
                  // Update conversions
                  queryLiveDb(
                    `UPDATE conversions SET input_amount_sent_to_exchange = ?, exchange_name = ? WHERE id = ?`,
                    [fromWeiToAmount(value - fee), exchange.exchange_name, conversion.id]
                  );
  
                  queryLiveDb(
                    `UPDATE wallet_info SET confirmed_balance = 0 WHERE id = ?`,
                    [conversion.wallet_id]
                  );
                   // Success
                   console.log("SUCCESS: ETH TRANSFERED FROM CONVERSIONS TO EXCHANGE", res);
  
                } catch(er) {
                  // Failure
                  console.log("ERROR: txETH: ", er);
                }
              });
  
  
            break;
  
            case "XRP":
              _.each(conversions, conversion => {
                try
                {
                  let value = fromAmountToXRP(conversion.confirmed_balance);
                  let fee = fromAmountToXRP(0.000012);  //Is this a fixed fee, If so make it a constant
  
                  if(value == 0)
                    return;
  
                  let tx = crypto.txXRP({
                    from: RIPPLE_ADDRESS,
                    to: exchange.exchange_wallet_address,
                    tag: exchange.tag,
                    value: fromXRPToAmount(value - fee),
                    secret: RIPPLE_SECRET
                  });
  
                  let res = Promise.await(XRP_api.submit(tx));
                  if(res.resultCode == "tesSUCCESS")
                  {
                    // Update conversions
                    queryLiveDb(
                      `UPDATE conversions SET input_amount_sent_to_exchange = ?, exchange_name = ? WHERE id = ?`,
                      [fromXRPToAmount(value - fee), exchange.exchange_name, conversion.id]
                    );
  
                    queryLiveDb(
                      `UPDATE wallet_info SET confirmed_balance = 0 WHERE id = ?`,
                      [conversion.wallet_id]
                    );
  
                    // Success, fiat was transferred from our holding wallet to the exchange.
                    console.log("SUCCESS: XRP transferred from wallet to "+exchange.exchange_name, res);
                  }
                  else{
                    console.log("FAILED: Could not transfer XRP to "+exchange.exchange_name, res);
                  }
  
                } catch(er) {
                  // Failure
                  console.log("ERROR: txXRP: ", er);
                }
              });
            break;
  
          }
        });
      }
  }
});


/*SyncedCron.add({
  name: 'transferCryptoFromExchangeToExchange',
  schedule: function(parser) {
	   return parser.text('every 40 seconds');
  },
  job: function() {
    if(!!SETTINGS['maintenance']) return false;
          // If we have sold not for AUD,
          // we must withdraw funds from this exchange out to another which has AUD
          if(exchange_rate.code_to !== "AUD")
          {
            // Give 1min for our sell order to fill out before sending out (just in case)
            Meteor.setTimeout(() =>
            {
              // Default example: withdraw BTC from binance -> btcmarkets
              let exchange_2 = _.find(q_exchange_balances, ex => {
                return ex.currency_code === exchange_rate.code_to && ex.exchange_name === "btcmarkets"
              });

              let feesCalc = (amount, code) => {
                // Binance trading fee 0.1%
                // Binance Withdraw fees:
                let fee = {"BTC": 0.0005, "ETH": 0.01};
                return amount - amount * 0.001 - fee[code]
              };

              let w = {
                exchange: c.exchange_name,
                code: exchange_rate.code_to,
                amount: feesCalc(exchange_rate.bid_price * c.input_amount_sent_to_exchange, exchange_rate.code_to),
                address: exchange_2.exchange_wallet_address
              };

              let res = withdrawFromExchange(w);
              console.log(res);
              if(res)
              {
                queryLiveDb(
                  `UPDATE conversions SET amount_withdrawn = ?, amount_withdrawn_to_exchange = ? WHERE id = ?`,
                  [w.amount, exchange_2.exchange, c.id]
                );
                // TODO: we now need to sell those funds for AUD
              }
            }, 60*1000);
          }
  }
});*/