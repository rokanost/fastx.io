SyncedCron.add({
  name: 'updateCurrencyRates',
  schedule: function(parser) {
	   return parser.text('every 1 hour');
  },
  job: function() {
    if(!!SETTINGS['maintenance']) return false;

    let q = queryLiveDb(`SELECT currency_code FROM currencies`);
    if(q && q.length > 0)
    {
      let base = "EUR"; // Default base currency on free fixer plan is EUR (can't be changed)
      let symbols = _.map(q, c => c.currency_code).join(",");
      HTTP.get("http://data.fixer.io/api/latest?access_key="+FIXER_API_KEY+"&symbols="+symbols, {timeout: 10000}, (er, res) => {
        // Error
        if(er)
        {
          console.log("fixer.io API: failed to get currency rates: ", er);
          return;
        }
        // Success
        if(res && res.data)
        {
          let rates = res.data.rates;
          let all_rates = {};
          // Calculate base rates
          _.each(rates, (rate,c) => {
            if(c != base) {
              all_rates[base+"/"+c] = rate;
              all_rates[c+"/"+base] = 1/rate;
            }
          });
          // Calculate all other rates
          _.each(rates, (r,c) => {
            _.each(rates, (r2,c2) => {
              if(c != c2 && rates[c] && rates[c2]) {
                all_rates[c+"/"+c2] = 1/r*r2
              }
            })
          });
          // Insert rates
          _.each(all_rates, (rate, pair) => {
            let code = pair.split("/");
            queryLiveDb(`INSERT INTO currency_rates (code_from, code_to, rate, datetime) VALUES (?,?,?,NOW())
              ON DUPLICATE KEY UPDATE rate = ?, datetime = NOW()`, [code[0], code[1], rate, rate]);
          });
        }
      });
    }
    return true;
  }
});
