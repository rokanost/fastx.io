// Output format:
// application/json
/*
  {
    user_uuid,
    input_code,
    output_code,
    input_amount,
    is_precise,
    bank: {
      country_code,
      bsb,
      number,
      account_name,
      description,
    }
    bpay: {
      bpay_biller_code,
      bpay_reference,
    },
    crypto: {
      output_address,
      refund_address,
    }
  }

*/

// Example:
Router.route('/api/createConversion', {where: 'server'}).post(function() {
  this.response.writeHead(200, {'Content-Type':'application/json'});
  try
  {
    check(this.request.headers.api_key,ApiKeyCheck);
    let params     = this.request.body;
    params.api_key = this.request.headers.api_key;

    let c = Meteor.call("createConversion", {params});

    this.response.end(JSON.stringify(c));
  }
  catch (e)
  {
    this.response.end(JSON.stringify({
      success: false,
      message: e.message || e
    }));
  }
});


Router.route('/api/conversion/:uuid', {where: 'server'}).get(function() {
  this.response.writeHead(200, {'Content-Type':'application/json'});
  try
  {
    // TODO: api key check from DB
    check(this.request.headers.api_key, ApiKeyCheck);
    check(this.params.uuid, uuidCheck);

    let q = queryLiveDb(
      `SELECT
          uuid, tag, input_code, input_amount, output_code, output_amount,
          datetime, refund_address, description, is_precise, status_id
        FROM conversions c
       WHERE uuid = ?`,
      [params.uuid]
    );

    if(q && q.length === 0) throw "Conversion not found.";

    this.response.end(JSON.stringify({
      success: true,
      data: {...q}
    }));
  }
  catch (e)
  {
    this.response.end(JSON.stringify({
      success: false,
      message: e.message || e
    }));
  }
});


Router.route('/img/:img_id', {where: 'server'}).get(function() {
  let p, id = parseInt(this.params.img_id);
  // Get by ID or SLUG
  if(!isNaN(id)) {
    p = {id}
  } else {
    p = {slug: this.params.img_id}
  }
  let base64 = Meteor.call("getImg", p);

  if(base64) {
    //this.response.statusCode = 200
    this.response.setHeader("Content-Type", "image/jpeg");
    this.response.setHeader("Cache-Control", "max-age=604800");
    return this.response.end(new Buffer(base64, 'base64'))
  }
  this.response.statusCode = 404
  return this.response.end("<h1>404 Not Found</h1>")
});