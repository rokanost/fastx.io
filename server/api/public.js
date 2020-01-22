// Output format:
// application/json
/*
  {
    success: true || false,
    message: "error reason" (only if sucess = false),
    data: Array || Object || String || Number
  }
*/

Router.route('/api/rates', {where: 'server'}).get(function() {
   let q = queryLiveDb(
    `SELECT
        code_from, code_to, rate, datetime
      FROM conversion_rates cr
        LEFT JOIN cryptos c
          ON c.crypto_code = cr.code_from
        LEFT JOIN cryptos c2
          ON c2.crypto_code = cr.code_to
      WHERE IFNULL(c.is_disabled, 0) = 0 AND IFNULL(c2.is_disabled, 0) = 0`, []
    );

    let response;
    if(q && q.length > 0)
    {
      response = {
        success: true,
        data: q
      };
    } else {
      response = {
        success: false,
        message: "Failed to retrieve rates"
      };
    }
    this.response.writeHead(200, {'Content-Type':'application/json'});
    this.response.end(JSON.stringify(response));
});
