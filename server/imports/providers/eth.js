const etherscan_URL = "https://api.etherscan.io/api";

export default ETH = {

  getBalance: (addr, includePending=false) => {
    return Promise.await(
      new Promise((resolve, reject) => {
        HTTP.get(etherscan_URL, {
          params: {
            module: "account",
            action: "balance",
            address: addr,
            tag: includePending ? "pending" : "latest",
            apikey: ETHERSCAN_API_KEY
          },
          timeout: 20000
        }, (er, res) => {
          // Check for errors
          if(er) return reject(er.message);
          if(res.data.message !== "OK")
            return reject(res.data.result);

          // Success
          resolve(fromWeiToAmount(parseInt(res.data.result)));
        });
      })
    );
  },

  getTokenBalance: (address, contractAddress) => {
    return Promise.await(
      new Promise((resolve, reject) => {
        HTTP.get(etherscan_URL, {
          params: {
            module: "account",
            action: "tokentx",
            address,
            contractAddress,
            apikey: ETHERSCAN_API_KEY
          },
          timeout: 20000
        }, (er, res) => {
          // Check for errors
          if(er) return reject(er.message);
          if(res.data.message !== "OK")
            return reject(res.data.message);

          // Success
          return resolve(fromWeiToAmount(_.reduce(res.data.result, (m,r) => {
            let isOut = r.to !== address;
            let v = parseInt(r.value);
            return isOut ? m - v : m + v;
          }, 0)));
        });
      })
    );
  },

  getBalances: (addresses, includePending=false) => {
    return Promise.await(
      new Promise((resolve, reject) => {
        HTTP.get(etherscan_URL, {
          params: {
            module: "account",
            action: "balancemulti",
            address: addresses.join(","),
            tag: includePending ? "pending" : "latest",
            apikey: ETHERSCAN_API_KEY
          },
          timeout: 20000
        }, (er, res) => {
          // Check for errors
          if(er) return reject(er.message);
          if(res.data.message !== "OK")
            return reject(res.data.result);

          // Success
          resolve(res.data.result.map(r => {
            return {
              address: r.account,
              amount: fromWeiToAmount(parseInt(r.balance))
            }
          }));
        });
      })
    );
  },

  txlist: (addr) => {
    return Promise.await(
      new Promise((resolve, reject) => {
        HTTP.get(etherscan_URL, {
          params: {
            module: "account",
            action: "txlist",
            address: addr,
            startblock: 0,
            endblock: 99999999,
            sort: "asc",
            apikey: ETHERSCAN_API_KEY
          },
          timeout: 20000
        }, (er, res) => {
          // Check for errors
          if(er) return reject(er.message);
          if(res.data.message !== "OK")
            return reject(res.data.result);

          // Success
          resolve(res.data.result);
        });
      })
    );
  },

  pushTx: (hex) => {
    return Promise.await(
      new Promise((resolve, reject) => {
        HTTP.post(etherscan_URL, {
          params: {
            module: "proxy",
            action: "eth_sendRawTransaction",
            hex: hex,
            apikey: ETHERSCAN_API_KEY
          },
          timeout: 10000
        }, (er, res) => {
          // Check for errors
          if(er) return reject(er.message);
          if(res.data.message !== "OK")
            return reject(res.data.result);
          // Success
          resolve(res.data);
        });
      })
    );
  },

  // INFURA
  getGasPrice: () => {
    return Promise.await(
      new Promise((resolve, reject) => {
        HTTP.get("https://api.infura.io/v1/jsonrpc/mainnet/eth_gasPrice", {
          timeout: 10000
        }, (er, res) => {
          // Check for errors
          if(er) return reject(er.message);
          // Success
          resolve(parseInt(res.data.result));
        });
      })
    );
  },
}
