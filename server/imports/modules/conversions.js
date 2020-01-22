import bitcoin from 'bitcoinjs-lib';
import providers from '../providers.js';

export const prepareTx = (p) => {

    check(p, {
      crypto_code: NonEmptyStringCheck,
      conversions: [PositiveIntCheck],
      to: StringCheck(25,34)
    });

    if(["BTC", "LTC"].indexOf(p.crypto_code) === -1)
     throw "Only BTC & LTC supported";

    if(p.conversions.length === 0)
      throw "Please provide at least one conversion";

    let q_conversions = queryLiveDb(
      `SELECT
        wi.id wallet_id, c.id conversion_id, crypto_address
      FROM conversions c
        JOIN wallet_info wi ON wi.id = c.input_info_id
        WHERE
          input_code = ? AND
          status_id = 3
          AND c.id IN(`+Array(p.conversions.length).fill('?')+`)`,
      [p.crypto_code].concat(p.conversions)
    );

    if(q_conversions && q_conversions.length === 0)
      throw "No available conversions found.";

    // Collect UTXOS from multiple addresses
    let res = [];
    _.each(q_conversions, (row, i) =>
    {
      // Check address just in case..
      check(row.crypto_address, StringCheck(25,34));
      // Also change providers, so we don't get blocked for too many requests
      // [i%2 ? 'blockchain' : 'blockexplorer']
      let req = providers[p.crypto_code].utxo(row.crypto_address);
      if(req.length === 0) {
        throw "Address "+row.crypto_address+" does not have any unspent transactions.";
      }
      // Add result to array
      res.push(req);
      // Wait for 2s between calls if there are more conversions
      if(q_conversions.length > 1) Promise.await(delay(2*1000));
    });

    // Create transaction
    let networks = {
      "BTC": bitcoin.networks.bitcoin,
      "LTC": bitcoin.networks.litecoin
    }

    let tx = new bitcoin.TransactionBuilder(networks[p.crypto_code]);
    let availableSat = 0;
    let keyPairs = [];

    _.each(res, (utxos, i) => {
      let keyPair = bitcoin.ECPair.fromWIF(
        // Get private key in WIF
        getPrivateKey({
          id: q_conversions[i].wallet_id,
          crypto_code: p.crypto_code
        }),
        networks[p.crypto_code]
      );
      _.each(utxos, utxo => {
        if(utxo.confirmations < MININUM_BTC_CONFIRMATIONS)
          throw "Conversion #"+q_conversions[i].conversion_id+", wallet #"+q_conversions[i].wallet_id+" has an unconfirmed tx";

        tx.addInput(utxo.txid, utxo.vout);
        keyPairs.push(keyPair);
        availableSat += utxo.satoshis;
      });
    });

    let feePerByte = providers[p.crypto_code].getFees();
    if(!feePerByte)
      throw "Failed to get "+p.crypto_code+" fees.";

    let fee = getTransactionSize(keyPairs.length, 0) * feePerByte;
    if(fee >= availableSat)
      throw p.crypto_code+" amount must be larger than the fee.";

    // Set output address and total output amount minus tx fee
    tx.addOutput(p.to, availableSat - fee);

    _.each(keyPairs, (keyPair, i) => {
      tx.sign(i, keyPair);
    });

    let hex = tx.build().toHex();

    return {
      amount: fromSatoshiToAmount(availableSat),
      fee: fromSatoshiToAmount(fee),
      hex
    }
}
