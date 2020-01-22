const blockchain_URL = "https://blockchain.info";

export default BTC = {

  getBalance: (addr, includePending=false) => {
    return Promise.await(
      new Promise((resolve, reject) => {
        HTTP.get(blockchain_URL+"/q/addressbalance/" + addr + "?confirmations="+(includePending ? 0 : MININUM_BTC_CONFIRMATIONS), {
          timeout: 20000
        }, (er, res) => {
          if(er) return reject(er.message);
          // Success
          resolve(fromSatoshiToAmount(parseInt(res.content)));
        });
      })
    );
  },

  // unconfirmed balance
  getBalances: (addresses) => {
    return Promise.await(
      new Promise((resolve, reject) => {
        HTTP.get(blockchain_URL+"/balance?active="+addresses.join("|"), {
          timeout: 20000
        }, (er, res) => {
          if(er) return reject(er.message);
          // Success, parse result..
          resolve(_.map(res.data, (r, address) => ({
            address,
            amount: fromSatoshiToAmount(parseInt(r.final_balance))
          })));
        });
      })
    );
  },

  utxo: (addr) =>  {
    return Promise.await(
      new Promise((resolve, reject) => {
        HTTP.get(blockchain_URL+"/unspent?active=" + addr, {
          timeout: 20000
        }, (er, res) => {
          if(er) return reject(er.message);
          // Success
          resolve(res.data.unspent_outputs.map(e => {
            return {
              txid: e.tx_hash_big_endian,
              vout: e.tx_output_n,
              satoshis: e.value,
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
        HTTP.post(blockchain_URL+"/pushtx", {
          params: {
            tx: hex
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
    return Promise.await(
      new Promise((resolve, reject) => {
        HTTP.get("https://bitcoinfees.earn.com/api/v1/fees/recommended", {
          timeout: 20000
        }, (er, res) => {
          if(er) return reject(er.message);
          // Success
          resolve(parseInt(res.data.fastestFee));
        });
      })
    );
  }
}
