import * as nanoCurrency from 'nanocurrency';
import WAValidator from 'wallet-address-validator';

//Used for generating random strings.
alphanumericAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

generateRandomString = (length, alphabet) => {
  let text = "";

  if (!alphabet) {
     alphabet = alphanumericAlphabet;
  }

  let alphabetLength = alphabet.length;

  for (let i = 0; i < length; i++) {
    text += alphabet.charAt(Math.floor(Math.random() * alphabetLength));
  }

  return text;
}

emailLayout = (html) => {
	return Spacebars.toHTML({
		body: html,
		BASE_URL: "https://fastx.io/"
	}, Assets.getText('email_templates/layout.html'));
};

// TODO: use bignumber lib instead
fromSatoshiToAmount = (v) => {
	return v / 100000000
}

fromAmountToSatoshi = (v) => {
	return v * 100000000
}

fromWeiToAmount = (v) => {
	return v / 1000000000000000000
}

fromAmountToWei = (v) => {
	return v * 1000000000000000000
}

fromXRPToAmount = (v) => {
	return v / 1000000
}

fromAmountToXRP = (v) => {
	return v * 1000000
}

fromRawToNano = (v) => {
  return parseFloat(nanoCurrency.convert(v, { from: 'raw', to: 'Nano' }))
};

fromNanoToRaw = (v) => {
  return nanoCurrency.convert(v.toString(), { from: 'Nano', to: 'raw' })
};

hex2dec = function(s) {

  function add(x, y) {
    var c = 0, r = [];
    var x = x.split('').map(Number);
    var y = y.split('').map(Number);
    while (x.length || y.length) {
      var s = (x.pop() || 0) + (y.pop() || 0) + c;
      r.unshift(s < 10 ? s : s - 10);
      c = s < 10 ? 0 : 1;
    }
    if (c) r.unshift(c);
    return r.join('');
  }

  var dec = '0';
  s.split('').forEach(function (chr) {
    var n = parseInt(chr, 16);
    for (var t = 8; t; t >>= 1) {
      dec = add(dec, dec);
      if (n & t) dec = add(dec, '1');
    }
  });
  return dec;
}


delay = ms => new Promise(resolve => Meteor.setTimeout(resolve, ms));

chunk = (array, size) => {
  return array.reduce((res, item, index) => {
    if (index % size === 0) res.push([]);
    res[res.length-1].push(item);
    return res;
  }, []);
}

getTransactionSize = (numInputs, numOutputs) => {
	return numInputs*180 + numOutputs*34 + 10 + numInputs;
}

toDecimalByTypeId = (v, type_id) => v.toFixed([1,4].indexOf(type_id) > -1 ? 2 : 8);

addressValidator = (address, code) => {
  switch (code) {
    case "NANO":
      return nanoCurrency.checkAddress(address);
    break;

    default:
      return WAValidator.validate(address, code);
    break;
  }
}

wait = (x) => {
  return Promise.await(x);
}