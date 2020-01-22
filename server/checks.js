AdminKeyCheck = Match.Where(function(x){
	check(x, String);
	return (x === ADMIN_KEY);
});

DocTypeCheck = Match.Where(function(x){
	check(x, String);
	return !!DOC_TYPES[x];
});

DocImgCheck = Match.Where(function(x) {
	check(x, String);
	return x.length/4*3 <= 2000000
});
VerificationTokenCheck = Match.Where(function(x){
	check(x, String);
	return x.length == VERIFICATION_TOKEN_LENGTH;
});
SessionTokenCheck = Match.Where(function(x){
	check(x, String);
	return x.length == SESSION_TOKEN_LENGTH;
});