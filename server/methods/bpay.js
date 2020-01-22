Meteor.methods({

  //Returns bpay details for a given biller_code
  getBpayDetails(biller_code) {

    _check(biller_code, Number, "BPAY Biller code must be 4 or more digits");

    //Check locally for result first (anything olders than 6 months we will requery)
    let clean_months = 6;
    let q = queryLiveDb(
      `SELECT name FROM bpay_codes WHERE biller_code = ? AND TIMESTAMPDIFF(MONTH,date_time,NOW()) < ?`,
      [biller_code, clean_months]
    );

    // Return if found
    if(q && q.length > 0) return q[0].name

    //Otherwise, we dont have the bpay biller id lets go to BPAY and get it.
    let uri = "https://www.bpay.com.au/Personal/Find-Biller-Codes-or-Financial-Institutions.aspx?find="+biller_code;
    let res = HTTP.get(uri, {
      timeout: 10000
    });

    if(res && res.content)
    {
      let company_name = res.content.match(/<h6 class="biller-company">(.*?)<\/h6>/g);
      if(company_name && company_name.length > 0)
      {
        company_name = company_name[0].replace('<h6 class="biller-company">',"").replace('</h6>',"");
        queryLiveDb(`INSERT INTO bpay_codes (biller_code, name, date_time) VALUES (?,?,NOW())`,[biller_code, company_name]);
        // Success
        return company_name;
      }
      // Not found, return empty
      return "";
    }
  }
});
