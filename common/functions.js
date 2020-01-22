getCoversionTypeId = (from, to) => {
	let fromCrypto = Match.test(from, CryptoCodeCheck);
	let toCrypto = Match.test(to, CryptoCodeCheck);
	if(fromCrypto && !toCrypto)
		return 1;
	if(fromCrypto && toCrypto)
		return 2;
	if(!fromCrypto && toCrypto)
		return 3;
	return 4;
}

isValidCryptoCode = (code) => {
	return CRYPTOS.indexOf(code) > -1
}

isValidCurrencyCode = (code) => {
	return CURRENCIES.indexOf(code) > -1
}

isValidCode = (code) => {
	return isValidCryptoCode(code) || isValidCurrencyCode(code)
}

padZeros = (t) => t < 10 ? "0"+t : t;