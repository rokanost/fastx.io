SyncedCron.add({
  name: 'updateCryptoRates',
  schedule: function(parser) {
	   return parser.text('every 1 minute');
  },
  job: function() {
    Meteor.call("updateCryptoRates");
    return true;
  }
});

Meteor.methods({
  updateCryptoRates() 
  {
    let q_cryptos = queryLiveDb(`SELECT crypto_code, min_price_check_amount, buy_fee_percent, sell_fee_percent FROM cryptos`);
    let q_currencies = queryLiveDb(`SELECT currency_code, buy_fee_percent, sell_fee_percent FROM currencies`);

    if(q_cryptos && q_cryptos.length && q_currencies && q_currencies.length)
    {
      let currencies = q_currencies.map(c => c.currency_code);

      // Combine pairs
      // 1. CRYPTO / FIAT
      let combinations = _.flatten(
        currencies.map(currency => {
         return q_cryptos.map(crypto => ({
           code_from: crypto.crypto_code,
           code_to: currency,
           pair: crypto.crypto_code+"/"+currency,
           min_price_check_amount: crypto.min_price_check_amount
         }))
        })
      );
      // 2. CRYPTO / CRYPTO
      combinations = combinations.concat(_.flatten(
        q_cryptos.map(crypto => {
         return q_cryptos.filter(c => c.crypto_code !== crypto.crypto_code).map(crypto2 => ({
           code_from: crypto.crypto_code,
           code_to: crypto2.crypto_code,
           pair: crypto.crypto_code+"/"+crypto2.crypto_code,
           min_price_check_amount: crypto2.min_price_check_amount
         }))
        })
      ));

      _.each(exchanges, (ex, name) => {
        Promise.await(ex.loadMarkets());
        combinations.forEach((comb, i) => {
          if(ex.markets[comb.pair])
          {
              let res = Promise.await(ex.fetchOrderBook(comb.pair));
              let ask_price = _.min(_.filter(res.asks, r => r[1] >= comb.min_price_check_amount), r => r[0]);
              let bid_price = _.max(_.filter(res.bids, r => r[1] >= comb.min_price_check_amount), r => r[0]);
              if(ask_price && ask_price.length && bid_price && bid_price.length)
              {
                queryLiveDb(`INSERT INTO exchange_rates (code_from, code_to, exchange, bid_price, bid_amount, ask_price, ask_amount, datetime) VALUES (?,?,?,?,?,?,?,NOW())
                    ON DUPLICATE KEY UPDATE bid_price = ?, bid_amount = ?, ask_price = ?, ask_amount = ?, datetime = NOW()`,
                    [comb.code_from, comb.code_to, name, bid_price[0], bid_price[1], ask_price[0], ask_price[1], bid_price[0], bid_price[1], ask_price[0], ask_price[1]]
                );
                // Add to rates history
                queryLiveDb(`INSERT INTO exchange_rates_history (code_from, code_to, exchange, bid_price, ask_price, datetime) VALUES (?,?,?,?,?,NOW())
                    ON DUPLICATE KEY UPDATE bid_price = ?, ask_price = ?, datetime = NOW()`,
                    [comb.code_from, comb.code_to, name, bid_price[0], ask_price[0], bid_price[0], ask_price[0]]
                );
              }
              // Add 2s delay between API calls
              Promise.await(delay(2000))
          }
        });
      });

      // SELECT EXCHANGE RATES
      let q_exchange_rates = queryLiveDb(`SELECT code_from, code_to, bid_price, ask_price, exchange FROM exchange_rates`);
      // SELECT CURRENCY RATES
      let q_currency_rates = queryLiveDb(`SELECT code_from, code_to, rate FROM currency_rates`);

      if(q_exchange_rates && q_exchange_rates.length > 0 && q_currency_rates && q_currency_rates.length > 0) 
      {
        // Combine the two
        let cryptos_and_currencies = q_cryptos.concat(q_currencies);

        let exchange_rates = [];
        // 1) Gather exchange rates
        _.each(q_exchange_rates, er => {
          // normal
          exchange_rates.push({
            code_from: er.code_from,
            code_to: er.code_to,
            rate: er.bid_price,
            exchange: er.exchange
          });
          // in-reversed
          exchange_rates.push({
            code_from: er.code_to,
            code_to: er.code_from,
            rate: 1/er.ask_price,
            exchange: er.exchange
          });
        });

        // 2. Gather currency rates
        _.each(q_currency_rates, cr => {
          exchange_rates.push({
            code_from: cr.code_from,
            code_to: cr.code_to,
            rate: cr.rate
          });
        });

        let getTheBestRate = (from, to) => {
          // TODO: we should improve this
          let priorities = ["AUD", "BTC", "ETH"];
          let rate = null;
          _.each(priorities, code => {
            if(!rate) {
              // Priority 1: Find fiat pair with AUD
              let toCode = _.find(exchange_rates, r => r.code_from === from && r.code_to === code);
              if(toCode) {
                // Find [CODE] to [TO]
                let fromCode = _.find(exchange_rates, r => r.code_from === code && r.code_to === to);
                if(fromCode) {
                  // Calculate and return rate
                  rate = toCode.rate * fromCode.rate
                }
              }
            }
          });
          if(!rate)
            throw "Failed to combine: "+from+"/"+to;

          return rate;
        };


        // Check for missing pairs
        _.each(cryptos_and_currencies, c => {
          let code = c.crypto_code || c.currency_code;
          _.each(cryptos_and_currencies, c2 => {
            let code2 = c2.crypto_code || c2.currency_code
            // Start combining
            if(code !== code2) {
              let found = _.find(exchange_rates, r => r.code_from === code && r.code_to === code2);
              if(!found)
              {
                exchange_rates.push({
                  code_from: code,
                  code_to: code2,
                  rate: getTheBestRate(code, code2)
                });
              }
              let found2 = _.find(exchange_rates, r => r.code_from === code2 && r.code_to === code);
              if(!found2)
              {
                exchange_rates.push({
                  code_from: code2,
                  code_to: code,
                  rate: getTheBestRate(code2, code)
                });
              }
            }
          });
        });

        // TODO: prevent from inserting outdated price rows

        // Merge cryptos and currencies into one array of fees
        let fees = _.map(q_cryptos.concat(q_currencies), c => ({
          code: c.crypto_code || c.currency_code,
          buy_fee_percent: c.buy_fee_percent,
          sell_fee_percent: c.sell_fee_percent
        }));

        // Insert rate into DB
        _.each(exchange_rates, er => {
          // Add our safe margin fee
          let rate = calcFee({
            from: er.code_from,
            to: er.code_to,
            rate: er.rate,  
            fees,
          });

          queryLiveDb(
            `INSERT INTO conversion_rates 
              (code_from, code_to, rate, rate_without_fee, datetime) VALUES(?,?,?,?,NOW())
              ON DUPLICATE KEY UPDATE rate = ?, rate_without_fee = ?, datetime = NOW()`,
            [er.code_from, er.code_to, rate, er.rate, rate, er.rate]
          );
          // Little break, just not to overload the mysql
          Promise.await(delay(200));
        });

      }
    }
  }
})

function calcFee(p) {
  let from = _.find(p.fees, f => f.code === p.from);
  let to = _.find(p.fees, f => f.code === p.to);
  // Add both buy & sell fees
  return p.rate - (p.rate * (from.sell_fee_percent / 100)) - (p.rate * (to.buy_fee_percent / 100))
}