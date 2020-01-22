const litecore_URL = "https://insight.litecore.io";

export default LTC = {

  getBalance: (addr) =>  {
    return Promise.await(
      new Promise((resolve, reject) => {
        HTTP.get(litecore_URL+"/api/addr/" + addr + "/balance", {
          timeout: 20000
        }, (er, res) => {
          if(er) return reject(er.message);
          // Success
          resolve(fromSatoshiToAmount(parseInt(res.content)));
        });
      })
    );
  },

  utxo: (addr) =>  {
    return Promise.await(
      new Promise((resolve, reject) => {
        HTTP.get(litecore_URL+"/api/addr/" + addr + "/utxo", {
          timeout: 20000
        }, (er, res) => {
          if(er) return reject(er.message);
          // Success
          resolve(res.data.map(e => {
            return {
              txid: e.txid,
              vout: e.vout,
              satoshis: e.satoshis,
              confirmations: e.confirmations
            }
          }));
        });
      })
    );
  },

  pushTx: (hex) => {
    return Promise.await(
      new Promise((resolve, reject) => {
        HTTP.post(litecore_URL+"/api/tx/send", {
          data: {
            rawtx: hex
          },
          timeout: 20000
        }, (er, res) => {
          if(er) return reject(er.message);
          // Success
          resolve(res);
        });
      })
    );
  },

  getFees: () => {
    // Default fee
    return 100;
  }
}
