Meteor.methods({

  //Wraps the sendEmail call with a check for captcha to prevent bot spamming
  sendEmailClient(p){
    check(p,{
      name: NonEmptyStringCheck,
      email: EmailCheck,
      subject: NonEmptyStringCheck,
      message: NonEmptyStringCheck,
      captchaData: NonEmptyStringCheck
    });
    let verifyCaptchaResponse = reCAPTCHA.verifyCaptcha(this.connection.clientAddress, p.captchaData);
    if (!verifyCaptchaResponse.success)
      throw new Meteor.Error("verification-error", "Captcha verification failed, please try again.");

    delete p.captchaData;
    let result = Meteor.call('sendEmail',p); //Call sendEmail as normal
    return true;
  },

  //Will send an email to support@fastx.io
  sendEmail(p)
  {
    check(p,{
      name: NonEmptyStringCheck,
      email: EmailCheck,
      subject: NonEmptyStringCheck,
      message: NonEmptyStringCheck
    });

    var msg = "Customer name: "+p.name+"<br>"+
              "Reply to: "+p.email+"<br><br>"+
              "Message: "+p.message;

    // Let other method calls from the same client start running, without
    // waiting for the email sending to complete.
    this.unblock();
    Email.send({
      to: "support@fastx.io",
      from: FROM_ADDR,
      replyTo: p.email,
      subject: p.subject,
      html: emailLayout(msg)
    });

    return true;
  },

  getChartData(crypto_code) {
    check(crypto_code, CryptoCodeCheck);

    let q = queryLiveDb(`SELECT
        code_from, code_to, ask_price, bid_price, DATE(datetime) as datetime
      FROM exchange_rates_history
        WHERE
          code_from = ? AND
          code_to = "AUD" AND
          datetime > NOW() - INTERVAL ? DAY
      GROUP BY DATE(datetime)
      ORDER BY datetime`,
      [crypto_code, 7] // Last 7 days
    );

    let result = {
      labels: [],
      data: []
    };

    if(q && q.length > 0) {
      _.each(q, d => {
        result.labels.push(d.datetime);
        result.data.push(d.bid_price);
      });
    }

    return result;
  },

  blogUpload(p) {
    check(p, {
      title: NonEmptyStringCheck,
      title_description: NonEmptyStringCheck,
      body: NonEmptyStringCheck,
      author_name: NonEmptyStringCheck,
      author_email: EmailCheck,
      hashtag_csv: NonEmptyStringCheck,
      image: DocImgCheck // 2mb
    });
    
    // Upload an image
    let q = queryLiveDb(`INSERT INTO large_objects (data) VALUES(?)`, [p.image]);
    p.hero_img_id = q.insertId;
    delete p.image;

    const fields = _.keys(p);
    queryLiveDb(
      `INSERT INTO blog (`+fields.join(",")+`, created_date) 
        VALUES(`+Array(fields.length).fill('?')+`, NOW())`, _.values(p)
    );

    Meteor.call("sendFBMessageToAdmins", {msg: "New blog post! Please check and approve."});
  }
});
