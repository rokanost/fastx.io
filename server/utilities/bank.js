//Returns the currency_code for a given country_code
getCurrency = function(country_code){
	check(country_code, CountryCodeCheck);

	if(!_.contains(COUNTRIES,country_code))
		throw new Meteor.Error("error","Country ID not supported");

	let q = queryLiveDb("SELECT currency_code FROM countries WHERE country_code = ?",[country_code]);
	if(q && q.length>0)
		return q[0].currency_code;
}

getBankInfoByID = function(id) {
	check(id, PositiveIntCheck);
	let q = queryLiveDb(
		`SELECT * FROM bank_info WHERE id = ?`, [id]
	);
	if(q && q.length > 0) {
		return q[0]
	}
	return null
}

findBankInfo = function(p) {
	check(p.account_name, NonEmptyStringCheck);
	check(p.number, NonEmptyStringCheck);
	check(p.country_code, CountryCodeCheck);

	let where = ['account_name = ?', 'number = ?', 'country_code = ?']
	let values = [p.account_name, p.number, p.country_code]
	if(p.country_code === "AU") {
		check(p.bsb, NonEmptyStringCheck);
		where.push('bsb = ?')
		values.push(p.bsb)
	}
	let q = queryLiveDb(
		`SELECT id FROM bank_info WHERE `+where.join(" AND "),
		values
	);
	if(q && q.length > 0) {
		return q[0].id
	}
	return null
}

findBankInfoByBpay = function(p) {
	check(p.bpay_biller_code, NonEmptyStringCheck);
	check(p.bpay_reference, NonEmptyStringCheck);
	let q = queryLiveDb(
		`SELECT id FROM bank_info WHERE bpay_biller_code = ? AND bpay_reference = ? AND country_code = ?`,
		[p.bpay_biller_code, p.bpay_reference, "AU"]
	);
	if(q && q.length > 0) {
		return q[0].id
	}
	return null
}

findBankInfoByPayId = function({payid_type, payid}) {
	let q = queryLiveDb(
		`SELECT id FROM bank_info WHERE payid_type = ? AND payid = ? AND country_code = ?`,
		[payid_type, payid, "AU"]
	);
	if(q && q.length > 0) {
		return q[0].id
	}
	return null
}

//Will create a bank_info entry based on the provided params
/*{
	country_code: "AU",
	//BANK
	account_name: "Nathan"
	number: 10163199,
	bsb: 062347,
	//BPAY
	bpay_biller_code: 2342351234,
	bpay_reference: 123124123123
}*/

createBankInfo = function(p){
	check(p.country_code, CountryCodeCheck);

	var args = [];
	var values = [];
	var valuesPlaceholder = [];
	var query = "INSERT INTO bank_info ";

	//Regional specific bank accounts
	switch(p.country_code) {
		case "AU":

			args.push("country_code");
			values.push("AU");
			valuesPlaceholder.push("?");

			args.push("currency_code");
			values.push("AUD");
			valuesPlaceholder.push("?");

			// PAYID
			if(p.payid_type && p.payid) {
				check(p.payid_type, PayIDTypeCheck);
				check(p.payid, NonEmptyStringCheck);

				args.push("payid_type");
				values.push(p.payid_type);
				valuesPlaceholder.push("?");

				args.push("payid");
				values.push(p.payid);
				valuesPlaceholder.push("?");
			}

			//BANK account
			if(p.account_name && p.number && p.bsb)
			{
				// Get bank name
				p.bank_name = BSB_NUMBERS[p.bsb.substring(0,2)] || BSB_NUMBERS[p.bsb.substring(0,3)] || "Unknown Bank";
				check(p.bank_name, NonEmptyStringCheck)
				check(p.account_name, TextFieldCheck)
				check(p.number,	AU_AccountNumberCheck)
				check(p.bsb, BsbCheck)

				if(p.bank_name)
				{
					args.push("bank_name");
					values.push(p.bank_name);
					valuesPlaceholder.push("?");
				}

				args.push("bsb");
				values.push(p.bsb);
				valuesPlaceholder.push("?");

				args.push("account_name");
				values.push(p.account_name);
				valuesPlaceholder.push("?");

				args.push("number");
				values.push(p.number);
				valuesPlaceholder.push("?");
			}

			//BPAY
			if(p.bpay_biller_code && p.bpay_reference) {
				check(p.bpay_biller_code, BpayBillerCodeCheck);
				check(p.bpay_reference, BpayReferenceCheck);

				args.push("bpay_biller_code");
				values.push(p.bpay_biller_code);
				valuesPlaceholder.push("?");

				args.push("bpay_reference");
				values.push(p.bpay_reference);
				valuesPlaceholder.push("?");
			}
			break;
		case "US":

			args.push("country_code");
			values.push("US");
			valuesPlaceholder.push("?");

			check(p.account_name, TextFieldCheck)
			check(p.number,	AU_AccountNumberCheck)

			args.push("currency_code");
			values.push("USD");
			valuesPlaceholder.push("?");

			args.push("bank_name");
			values.push("Bank");
			valuesPlaceholder.push("?");

			args.push("account_name");
			values.push(p.account_name);
			valuesPlaceholder.push("?");

			args.push("number");
			values.push(p.number);
			valuesPlaceholder.push("?");

		break;
	}

	query += "("+args.toString() + ") VALUES ("+valuesPlaceholder.toString()+")";
	let q = queryLiveDb(query,values);

	if(q)
		return q.insertId;
	else
		throw new Meteor.Error("check-error","Could not insert into bank_info",p);
}
