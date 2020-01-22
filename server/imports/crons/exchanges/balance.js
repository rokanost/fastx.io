SyncedCron.add({
  name: 'updateExchangeBalances',
  schedule: function(parser) {
	   return parser.text('every 1 minute');
  },
  job: function() {
    if(!!SETTINGS['maintenance']) return false;
    //console.log("Update exchange balances..");
    _.each(exchanges, (ex, exchange_name) => {
      let response = getExchangeBalance(exchange_name);
      if(response) {
        let q_cryptos = queryLiveDb(`SELECT currency_code FROM exchange_balances`);
        if(q_cryptos && q_cryptos.length > 0)
        {
          _.each(q_cryptos, (c) => {
            let row = response[c.currency_code];
            if(row) {
              // Update balance
              queryLiveDb(
                `UPDATE exchange_balances SET balance = ?
                WHERE exchange_name = ? AND currency_code = ?`,
                [row.free, exchange_name, c.currency_code]
              );
            }
          });
        }
      }
    });

    return true;
  }
});


SyncedCron.add({
  name: 'withdrawExchangeBalances',
  schedule: function(parser) {
     return parser.text('every 6 hours');
  },
  job: function() {
    if(!!SETTINGS['maintenance']) return false;

    let q = queryLiveDb(`SELECT exchange_name, balance, currency_code FROM exchange_balances`);
    _.each(q, (row) => {
      // Withdraw AUD from btcmarkets if balance more than 100$
      // if(row.exchange_name === "btcmarkets" && row.currency_code === "AUD") {
      //   if(row.balance >= SETTINGS['keep_aud_amount_on_exchange']) {
      //     let params = {
      //       accountName: "",
      //       accountNumber: "",
      //       bankName: "",
      //       bsbNumber: "",
      //       amount: (row.balance-SETTINGS['keep_aud_amount_on_exchange'])*100000000,
      //       currency: "AUD"
      //     };
      //     let res = Promise.await(exchanges[row.exchange_name].privatePostFundtransferWithdrawEFT(params));
      //     console.log(res);
      //   }
      // }
    });
    return true;
  }
});
