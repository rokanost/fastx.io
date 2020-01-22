// String checks
StringCheck = (min, max) => {
  return Match.Where(function (x) {
  	check(x, String);
    // If no max provided, match exact length
  	return !max ? x.length === min : x.length >= min && x.length <= max;
  });
};

StringLength = (exact) => {
  return Match.Where(function (x) {
  	check(x, String);
    // Match exact length
  	return x.length === exact;
  });
};

NonEmptyStringCheck = Match.Where(function (x) {
	check(x, String);
	return x.length > 0;
});

// Email check
EmailRegex = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
EmailCheck = Match.Where(function (emailaddr) {
	check(emailaddr, StringCheck(5, 254));
	return EmailRegex.test(emailaddr);
});

// Boolean check 0 or 1
BoolAsNumCheck = Match.Where(function (x) {
	return x === 0 || x === 1;
});

// Integer check
PositiveIntCheck = Match.Where(function (x) {
	check(x, Number);
	return (x >= 0 && x%1 === 0);
});

NumberCheck = Match.Where(function (x) {
	check(x, Number);
	return (x >= 0);
});

InputAmountCheck = Match.Where(function(x){
	check(x, Number);
	return (x > 0);
});

//Length of 8 chars or more
//One lower case character
//One upper case character
//Has at least one number
//Less than 255 chars
PasswordCheck = Match.Where(function(password){

	let result = {
		minLength: false,
		maxLength: false,
		lowerCase: false,
		upperCase: false,
		hasNumber: false
	};

	(password.length >= 8) ? result.minLength = true : result.minLength = false;
	(password.length <= 100) ? result.maxLength = true : result.maxLength = false;
	for(i=0; i<password.length; i++)
	{
		if('A' <= password[i] && password[i] <= 'Z') // check if you have an uppercase
				result.upperCase = true;
		if('a' <= password[i] && password[i] <= 'z') // check if you have a lowercase
				result.lowerCase = true;
		if('0' <= password[i] && password[i] <= '9') // check if you have a numeric
				result.hasNumber = true;
	}

	return (result.minLength && result.maxLength && result.lowerCase && result.upperCase && result.hasNumber);
});

CryptoCodeCheck = Match.Where(function (x) {
	check(x, StringCheck(3,4));
	return CRYPTOS.indexOf(x) !== -1
});

CurrencyCodeCheck = Match.Where(function(x) {
	check(x, StringLength(3));
	return CURRENCIES.indexOf(x) !== -1
});

CodeCheck = Match.OneOf(CryptoCodeCheck, CurrencyCodeCheck);

TypeIdCheck = Match.Where(function (x) {
	check(x, PositiveIntCheck);
	return !!TYPES[x]
});

CountryCodeCheck = Match.Where(function(x){
	check(x,StringLength(2));
	return COUNTRIES.indexOf(x) !== -1
});

ApiKeyCheck = Match.Where(function(x){
	check(x,String);
	return (x.length === API_KEY_LENGTH);
});

TextFieldCheck = Match.Where(function(x){
	check(x,StringCheck(2,50));
	return true;
});

uuidCheck = Match.Where(function(x){
	check(x,StringLength(36));
	return true;
});

///////////// AU BANK CHECKS ////////////
AU_AccountNumberCheck = Match.Where(function(x){
	return StringCheck(6,10);
});

BsbCheck = Match.Where(function(x){
	return StringLength(6);
});

BpayBillerCodeCheck = Match.Where(function(x){
	return StringCheck(4,8);
});

BpayReferenceCheck = Match.Where(function(x){
	return StringCheck(4,20);
});

ObjectNotEmpty = Match.Where(function(x){
	return !_.isEmpty(x);
});

PayIDTypeCheck = Match.Where(function(x){
	check(x, NonEmptyStringCheck);
	return ["phone"].indexOf(x) !== -1
});

AddressObjectCheck = Match.Where(function(x){
	check(x, {
		streetNumber: NonEmptyStringCheck,
		streetName: NonEmptyStringCheck,
		suburb: NonEmptyStringCheck,
		state: NonEmptyStringCheck,
		postcode: NonEmptyStringCheck,
		country: CountryCodeCheck
	});
	return true;
});

CheckAddress = function(addressObj){
	let msg = [];
	if(!addressObj.streetNumber)
		msg.push("streetNumber");
	if(!addressObj.streetName)
		msg.push("streetName");
	if(!addressObj.suburb)
		msg.push("suburb");
	if(!addressObj.state)
		msg.push("state");
	if(!addressObj.postcode)
		msg.push("postcode");
	if(!addressObj.country)
		msg.push("country");

	if(msg.length)
	{
		sAlert.error("The address provided is missing valid: "+msg.join(", "));
		return false;
	}
	return true;
}

/////////////////////////////////////////////

// Custom check function error
_check = function (value, pattern, message) {
	try {
	  check(value, pattern);
	} catch (error) {
	  throw new Meteor.Error("check-error", message);
	}
};