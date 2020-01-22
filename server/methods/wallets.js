import bip39 from 'bip39';
import bitcoin from 'bitcoinjs-lib';
import ethereumjs_hdkey from 'ethereumjs-wallet/hdkey';
import * as nanoCurrency from 'nanocurrency';
import { blake2bFinal, blake2bInit, blake2bUpdate } from 'blakejs';
import bch from 'bitcoincashjs';
import providers from '../imports/providers';

wallets = {
  // ==== BTC ======
  BTC: {
    createAddress: ({id}) => {
      let seed = bip39.mnemonicToSeed(MNEMONIC_PRIVATE_SEED);
      let key = bitcoin.HDNode.fromSeedBuffer(seed);
      let derived = key.derive(id);
      return derived.getAddress();
    },
    getPrivateKey: ({id}) => {
      let seed = bip39.mnemonicToSeed(MNEMONIC_PRIVATE_SEED);
      let key = bitcoin.HDNode.fromSeedBuffer(seed);
      let derived = key.derive(id);
      return derived.keyPair.toWIF();
    }
  },
  // ==== BCH ======
  BCH: {
    createAddress: ({id}) => {
      // NOTE: derive should be improved
      const value = new Buffer(MNEMONIC_PRIVATE_SEED + "-" + id);
      const hash = bch.crypto.Hash.sha256(value);
      const bn = bch.crypto.BN.fromBuffer(hash);
      const address = new bch.PrivateKey(bn).toAddress();
      return address.toString();
    },
    getPrivateKey: ({id}) => {
      const value = new Buffer(MNEMONIC_PRIVATE_SEED + "-" + id);
      const hash = bch.crypto.Hash.sha256(value);
      const bn = bch.crypto.BN.fromBuffer(hash);
      return new bch.PrivateKey(bn);
    },
    tx: ({id, value, to, fee}) => {
      const privateKey = wallets.BCH.getPrivateKey({id});
      const address = privateKey.toAddress();
      const utxo = _.map(providers.BCH.utxo(address), t => ({
            script: new bch.Script(address).toHex(),
            address,
            ...t
        })
      );
      const transaction = new bch.Transaction()
        .from(utxo)
        .to(to, value)
        .fee(fee)
        .sign(privateKey);

      return transaction.toString();
    }
  },
  // ==== LTC =======
  LTC: {
    createAddress: ({id}) => {
      let seed = bip39.mnemonicToSeed(MNEMONIC_PRIVATE_SEED);
      let key = bitcoin.HDNode.fromSeedBuffer(seed, bitcoin.networks.litecoin);
      let derived = key.derive(id);
      return derived.getAddress();
    },
    getPrivateKey: ({id}) => {
      let seed = bip39.mnemonicToSeed(MNEMONIC_PRIVATE_SEED);
      let key = bitcoin.HDNode.fromSeedBuffer(seed, bitcoin.networks.litecoin);
      let derived = key.derive(id);
      return derived.keyPair.toWIF();
    }
  },
  // ==== ETH ======
  ETH: {
    createAddress: ({id}) => {
      let k = ethereumjs_hdkey.fromMasterSeed(MNEMONIC_PRIVATE_SEED);
      return k.deriveChild(id).getWallet().getAddressString();
    },
    getPrivateKey: ({id}) => {
      let retrieved = ethereumjs_hdkey.fromMasterSeed(MNEMONIC_PRIVATE_SEED);
      return retrieved.deriveChild(id).getWallet().getPrivateKey();
    }
  },
  // ==== XRP ======
  // Only one static address needed for everyone
  // We use DestinationTag to verify who transferred
  XRP: {
    createAddress: ({id}) => {
      return RIPPLE_ADDRESS;
    },
    getPrivateKey: ({id}) => {
      return RIPPLE_SECRET;
    }
  },
  /// ===== NANO ========
  NANO: {
    createAddress: ({id}) => {
      let seedBuffer = bip39.mnemonicToSeed(MNEMONIC_PRIVATE_SEED);
      let seed = Buffer.from(seedBuffer).toString('hex');
      let secretKey = NANOderiveSecretKey(seed, id); //nanoCurrency.deriveSecretKey(seed, id);
      let publicKey = nanoCurrency.derivePublicKey(secretKey);
      let address = nanoCurrency.deriveAddress(publicKey);
      if(nanoCurrency.checkAddress(address)) {
        return address;
      }
    },
    getPrivateKey: ({id}) => {
      let seedBuffer = bip39.mnemonicToSeed(MNEMONIC_PRIVATE_SEED);
      let seed = Buffer.from(seedBuffer).toString('hex');
      // Temp solution
      return NANOderiveSecretKey(seed, id); //nanoCurrency.deriveSecretKey(seed, id);
    }
  }
}


/// UNIFIED
createCryptoAddress = ({id, crypto_code}) => {
  return wallets[crypto_code].createAddress({id});
}

/// UNIFIED
getPrivateKey = ({id, crypto_code}) => {
  return wallets[crypto_code].getPrivateKey({id});
}




function NANOderiveSecretKey(seed, id) {
  const seedBytes = hexToByteArray(seed);
  const indexBuffer = new ArrayBuffer(4);
  const indexView = new DataView(indexBuffer);
  indexView.setUint32(0, id);
  const indexBytes = new Uint8Array(indexBuffer);

  const context = blake2bInit(32);
  blake2bUpdate(context, seedBytes);
  blake2bUpdate(context, indexBytes);
  const secretKeyBytes = blake2bFinal(context);

  return byteArrayToHex(secretKeyBytes);
}

function hexToByteArray (hex) {
  if (!hex) {
    return new Uint8Array()
  }

  const a = []
  for (let i = 0; i < hex.length; i += 2) {
    a.push(parseInt(hex.substr(i, 2), 16))
  }

  return new Uint8Array(a)
}

function byteArrayToHex (byteArray) {
  if (!byteArray) {
    return ''
  }

  let hexStr = ''
  for (let i = 0; i < byteArray.length; i++) {
    let hex = (byteArray[i] & 0xff).toString(16)
    hex = hex.length === 1 ? '0' + hex : hex
    hexStr += hex
  }

  return hexStr.toUpperCase()
}