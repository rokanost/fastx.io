
generateSHA512Hash = () => {
	let alphabet = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
	return generateRandomString(16, alphabet);
}


verifycryptSHA512 = function(passwd, cryptstring)
{
	newcryptstring = sha512crypt(passwd, cryptstring);
	let result = timeinvariantequals(newcryptstring, cryptstring);
	return result;
}

function timeinvariantequals(buf1, buf2) {
	// constant-time comparison. A drop in the ocean compared to our
	// non-constant-time modexp operations, but still good practice.
	var mismatch = buf1.length - buf2.length;
	if (mismatch) {
		return false;
	}
	for (var i = 0; i < buf1.length; i++) {
		mismatch |= buf1[i] ^ buf2[i];	//XOR each character in the hash together and OR that with mismatch (to set it to 1 if there is a mismatch)
	}
	return mismatch === 0;
}
