let url = "http://149.28.162.89:7076";
let headers = {};

export default NANO = {

  getBalance(addr, includePending=false) {
    return Promise.await(
      new Promise((resolve, reject) => {
        HTTP.post(url, {
          headers,
          data: {
            "action": "account_balance",
            "account": addr
          },
          timeout: 20000
        }, (er, res) => {
          // Check for errors
          if(er) return reject(er.message);
          if(res.data.error)
            return reject(res.data.error);
            
          // Success
          resolve(fromRawToNano(res.data.balance) + (includePending ? fromRawToNano(res.data.pending) : 0))
        })
      })
    )
  },

  getBalances(addresses, includePending=false) {
    return Promise.await(
      new Promise((resolve, reject) => {
        HTTP.post(url, {
          headers,
          data: {
            "action": "accounts_balances",
            "accounts": addresses
          },
          timeout: 20000
        }, (er, res) => {
          // Check for errors
          if(er) return reject(er.message);
          if(res.data.error)
            return reject(res.data.error);

          // Success
          resolve(_.map(res.data.balances, (r, address) => {
            return {
              address,
              amount: fromRawToNano(r.balance)+(includePending ? fromRawToNano(r.pending) : 0)
            }
          }));
        })
      })
    )
  },

  publish: (block) => {
    return Promise.await(
      new Promise((resolve, reject) => {
        HTTP.post(url, {
          headers,
          data: {
            "action": "process",
            "block": JSON.stringify(block)
          },
          timeout: 10000
        }, (er, res) => {
          // Check for errors
          if(er) return reject(er.message);
          if(res.data.error)
            return reject(res.data.error);

          // Success
          resolve(res.data.hash)
        });
     })
    )
  },

  work(hash) {
    return Promise.await(
      new Promise((resolve, reject) => {
        HTTP.post(url, {
          headers,
          data: {  
            "action": "work_generate",
            hash
          },
          timeout: 5*60000
        }, (er, res) => {
          // Check for errors
          if(er) return reject(er.message);
          if(res.data.error)
            return reject(res.data.error);

          // Success
          resolve(res.data.work)
        })
      })
    )
  },

  getAccountInfo(address) {
    return Promise.await(
      new Promise((resolve, reject) => {
        HTTP.post(url, {
          headers,
          data: {  
            "action": "account_info",
            "account": address,  
            "pending": "true"
          },
          timeout: 20000
        }, (er, res) => {
          // Check for errors
          if(er) return reject(er.message);
          if(res.data.error)
            return reject(res.data.error);

          // Success
          resolve(res.data)
        })
      })
    )
  },

  getPendingBlocks(address, count = 1, source = false) {
    return Promise.await(
      new Promise((resolve, reject) => {
        HTTP.post(url, {
          headers,
          data: {  
            "action": "pending",
            "account": address,  
            count,
            source
          },
          timeout: 20000
        }, (er, res) => {
          // Check for errors
          if(er) return reject(er.message);
          if(res.data.error)
            return reject(res.data.error);
            
          // Success
          resolve(res.data.blocks)
        })
      })
    )
  }

}
