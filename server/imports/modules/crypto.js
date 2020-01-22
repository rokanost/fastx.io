import providers from '../providers.js';
import EthereumTx from 'ethereumjs-tx';

export default crypto = {

  // Get single address balance
  getBalance: ({crypto_code, crypto_address}) => {
    check(crypto_code, CryptoCodeCheck);
    check(crypto_address, NonEmptyStringCheck);

    return providers[crypto_code].getBalance(crypto_address);
  },

  // Get balance for multiple addresses
  getBalances: ({crypto_code, crypto_addresses, includePending = false}) => {
    check(crypto_code, CryptoCodeCheck);
    check(crypto_addresses, Array);

    if(!crypto_addresses.length) throw "Please provide at least one address";
    if(crypto_addresses.length > 20) throw "Maximum 20 addresses allowed";

    return providers[crypto_code].getBalances(crypto_addresses, includePending);
  },

  // Create ETH tx
  txETH: ({nonce, value, to, privateKey, gasLimit, gasPrice}) => {
    const tx = new EthereumTx({
      nonce,
      gasPrice,
      gasLimit,
      to,
      value,
      chainId: 1
    });
    tx.sign(privateKey);
    return tx.serialize().toString('hex');
  },

  txXRP: ({from, to, value, secret, tag}) => {
    let params = {
      source: {
        address: from,
        maxAmount: {
          value: value.toString(),
          currency: 'XRP'
        }
      },
      destination: {
        address: to,
        amount: {
          value: value.toString(),
          currency: 'XRP'
        }
      }
    };
    // Optional
    if(tag) params.destination.tag = tag;

    let prepared = Promise.await(XRP_api.preparePayment(from, params));
    return XRP_api.sign(prepared.txJSON, secret).signedTransaction
  }
};
