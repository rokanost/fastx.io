const URL = "https://bch-chain.api.btc.com/v3";

export default BCH = {

  getBalance: (addr, includePending=false) => {
    return Promise.await(
      new Promise((resolve, reject) => {
        HTTP.get(URL+"/address/" + addr, {
          timeout: 20000
        }, (er, res) => {
            // Check for errors
            if(er) return reject(er.message);
            if(res.data.data === null) return resolve(0);
            if(!res.data.data) return reject("No data");
            // Success
            resolve(
                fromSatoshiToAmount(
                    // balance is with pending already
                    res.data.data.balance - (includePending ? 0 : res.data.data.unconfirmed_received)
                )
            );
        });
      })
    );
  },

  getBalances: (addresses, includePending=false) => {
    return Promise.await(
      new Promise((resolve, reject) => {
        HTTP.get(URL+"/address/" + addresses.join(","), {
          timeout: 20000
        }, (er, res) => {
            // Check for errors
            if(er) return reject(er.message);
            if(!res.data.data) return reject("No data");
            // Success
            resolve(addresses.map(address => {
              let r = res.data.data.find(a => a.address === address);
              return {
                address,
                amount: r ? fromSatoshiToAmount(
                  r.balance - (includePending ? 0 : r.unconfirmed_received)
                ) : 0
              }
            }));
        });
      })
    );
  },

  getTx: (id) => {
    return Promise.await(
        new Promise((resolve, reject) => {
          HTTP.get(URL+"/tx/"+id, {
            timeout: 20000
          }, (er, res) => {
            if(er) return reject(er.message);
            // Success
            resolve(ras.data.data);
          });
        })
      );
  },

  utxo: (addr) =>  {
    return Promise.await(
      new Promise((resolve, reject) => {
        HTTP.get(URL+"/address/"+addr+"/unspent", {
          timeout: 20000
        }, (er, res) => {
          if(er) return reject(er.message);
          if(!res.data.data) return reject("No data");
          let list = res.data.data.list;
          if(!list.length) return reject("No unspent funds");
          // Success
          resolve(list.map(t => ({
            txId: t.tx_hash,
            outputIndex: t.tx_output_n,
            satoshis: t.value
          })));
        });
      })
    );
  },

  pushTx: (rawhex) => {
    return Promise.await(
        new Promise((resolve, reject) => {
            HTTP.post("https://bch.btc.com/tools/tx-publish", {
                params: {
                    rawhex
                },
                timeout: 10000
            }, (er, res) => {
                if(er) return reject(er.message);
                if(res.data.err_msg) return reject(res.data.err_msg);
                // Success
                resolve("OK");
            });
        })
    );
  }
}