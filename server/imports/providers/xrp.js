export default XRP = {

  getBalance: (addr) => {
    return Promise.await(
      XRP_api.getBalances(addr)
        .then(balances => {
          return balances.find(b => b.currency === "XRP").value
        })
    );
  },

  getTransactions: (addr) => {

    const serverInfo = Promise.await(XRP_api.getServerInfo());
    const ledgers = serverInfo.completeLedgers.split('-');
    const minLedgerVersion = Number(ledgers[0]);
    const maxLedgerVersion = Number(ledgers[1]);

    return Promise.await(
      XRP_api.getTransactions(addr, {
        minLedgerVersion,
        maxLedgerVersion
      })
    );
  },


  calculateTagBalance: (addr, tag, txs) => {
    let total_amount = 0;
    txs.filter(tx => tx.specification.destination.address === addr).forEach(tx => {
      if(tx.outcome.result === "tesSUCCESS" && tx.outcome.deliveredAmount.currency === "XRP")
      {
        if(tx.specification.destination.tag === tag) {
          // Update total amount received only if more than 0
          let amount = parseFloat(tx.outcome.deliveredAmount.value);
          if(amount && amount > 0)
          {
            total_amount += amount
          }
        }
      }
    });
    return total_amount;
  },


}
