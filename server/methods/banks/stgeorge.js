stgeorge = {

  login: function() {
    this.page = wait(puppet.browser.newPage());
    wait(this.page.goto('https://ibanking.stgeorge.com.au/ibank/loginPage.action'));
    wait(this.page.type('#access-number', ST_GEORGE_USERNAME));
  },

  initBankPaymentPuppet: function(conversion_uuid)
  {
    try
    {
      check(conversion_uuid, uuidCheck);

      // Select unpaid bank conversion AUD
      let q = queryLiveDb(`
        SELECT
          c.id, bsb, number, account_name, output_amount, email, bpay_biller_code, bpay_reference
        FROM conversions c
          JOIN bank_info bi ON bi.id = c.output_info_id
          JOIN users u ON u.id = c.user_id
        WHERE
          type_id = 1 AND
          status_id = 3 AND
          output_sent_datetime IS NULL AND
          ((
            bsb IS NOT NULL AND
            number IS NOT NULL AND
            account_name IS NOT NULL
          ) OR (
            bpay_biller_code IS NOT NULL AND
            bpay_reference IS NOT NULL
          ))
          AND output_code = "AUD"
          AND c.uuid = ?`, [conversion_uuid]
      );

      if(!q || (q && q.length === 0))
        throw "This conversion can't be paid or is already paid.";

      console.log("Autopay: Starting Bank Transfer");

      // Init the browser...
      puppet.initBrowser();
      console.log("Autopay: Browser Initialised, Logging in..");

      let recipient = q[0];

      // 1) LOGIN
      this.page = wait(puppet.browser.newPage());
      wait(this.page.goto('https://ibanking.stgeorge.com.au/ibank/loginPage.action'));
      wait(this.page.type('#access-number', ST_GEORGE_USERNAME));
      wait(this.page.type('#internet-password', ST_GEORGE_PASSWORD));
      wait(this.page.type('#securityNumber', ST_GEORGE_PIN));
      // Wait for enable.action response
      wait(this.page.click('#logonButton', {delay: 2000}));

      console.log("Autopay: Checking balance");

      // Check balance
      wait(this.page.waitFor('.balance-details dd:nth-child(4)'));
      let balance = wait(this.page.$eval('.balance-details dd:nth-child(4)', dd => {
        return parseFloat(dd.innerText.replace("$","").replace(/,/g, ''));
      }));

      if(balance < recipient.output_amount)
        throw "Insufficient funds in bank account. (Available $"+balance+")";

      console.log("Autopay: Balance OK - $"+balance +", creating payment");

      // 2) CREATE A PAYMENT
      wait(this.page.waitFor('#mainMenu1 a'));
      wait(this.page.click('#mainMenu1 a'));


      let type = recipient.bsb ? "bank" : "bpay";
      switch (type) {
        case "bank":
          wait(this.page.waitFor('[href^="loadTPTransferPage.action?method=processDefault"]'));
          wait(this.page.click('[href^="loadTPTransferPage.action?method=processDefault"]'));
          // Fill-in Bank details
          wait(this.page.waitFor('#addNewTP'));
          wait(this.page.click('#addNewTP'));
          wait(this.page.type('#newTPName', recipient.account_name));
          wait(this.page.type('#newTPBSB', recipient.bsb));
          wait(this.page.type('#newTPNumber', recipient.number));
          wait(this.page.click('#saveTP')); // Uncheck to ignore payee save
          // Send a copy if email provided
          if(recipient.email)
          {
            wait(this.page.click('#sendTPEmail'));
            wait(this.page.type('#payeeEmailAddr', recipient.email));
          }
        break;

        case "bpay":
          wait(this.page.waitFor('[href^="loadBpayTransferPage.action?method=processDefault"]'));
          wait(this.page.click('[href^="loadBpayTransferPage.action?method=processDefault"]'));
          wait(this.page.waitFor('#addNewBiller'));
          wait(this.page.click('#addNewBiller'));
          wait(this.page.type('#newBillerCode', recipient.bpay_biller_code));
          wait(this.page.click('#showBillerName a'));
          wait(this.page.type('#newCustRefNum', recipient.bpay_reference));
        break;
      }

      wait(this.page.type('#amt', recipient.output_amount.toString()));
      wait(this.page.$eval('#payerName', input => input.value = 'FastX'));

      wait(this.page.waitFor('#transferNowButton input'));
      wait(this.page.click('#transferNowButton input', {delay: 2000}));
      wait(this.page.waitFor('#confButtonArea input'));
      wait(this.page.click('#confButtonArea input'));

      wait(this.page.waitFor(2000));
      /* 
      // NOT NEEDED WHEN SMS IS OFF

      wait(this.page.waitFor('#ButtonArea input'));
      wait(this.page.click('#ButtonArea input'));
      wait(this.page.waitFor(2000));*/

      // Duplicates
      if(wait(this.page.$('#tpTransferDupConfirm_duplicatePaymentCount')) !== null) {
        console.log("Autopay: Handling duplicates");
        wait(this.page.$eval('#FormBorder', el => { el.parentNode.removeChild(el); }));
        let number = wait(this.page.$eval('#FormBorder', dd => {
          return dd.innerText.match(new RegExp("please enter " + "(.*) in"))[1];
        }));
        wait(this.page.type('#tpTransferDupConfirm_duplicatePaymentCount', number));
        wait(this.page.click('#ButtonArea input'));
         /* 
        // NOT NEEDED WHEN SMS IS OFF
        wait(this.page.waitFor('#ButtonArea input'));
        wait(this.page.click('#ButtonArea input'));
        */
      }

      wait(this.page.waitFor('.receipt'));

      this.page.close();

      //  NOT NEEDED WHEN SMS IS OFF
      //wait(this.page.waitFor('#secureCode'));
      // Assign conversion id to a this.page (for further sms verification check)
      //this.page.id = recipient.id;

      return recipient;
    }
    catch(error)
    {
      let message = "Exception in initBankTransfer<br/><br/>"+(error.message || error);
      Meteor.call("sendEmail",{
        name:"AUTOPAY",
        email:"support@fastx.io",
        subject:"Error in initBankTransfer",
        message
      });
      throw error;
    }
  },

  /// DISABLED
  smsCodeConfirmation: function(p) {
    return false;
    /*try
    {
      check(p, {
        id          : PositiveIntCheck,
        code        : NonEmptyStringCheck,
        admin_key   : AdminKeyCheck
      });

      if(!puppet.browser || !this.page)
        throw "Please init payment this.page";

      if(this.page.id !== p.id)
        throw "The payment this.page and specified conversion does not match.";

      // Unset this.page.id in case sms was sent multiple times etc
      this.page.id = null;

      // Select where tx confirmed and output not sent
      let q = queryLiveDb(
        `SELECT id FROM conversions 
            WHERE 
          output_sent_datetime IS NULL AND 
          status_id = 3 AND
          id = ?`, [p.id]
      );

      if(q && q.length === 0)
        throw "This conversion can't be paid or is already paid.";

      wait(this.page.type('#secureCode', p.code, {delay: 500}));
      wait(this.page.click('#ButtonArea input'));
      // Wait for confirmation
      wait(this.page.waitFor('.receipt'));
      // Close the this.page
      this.page.close();
      this.page = null;

      // Update status
      queryLiveDb(`UPDATE conversions SET output_sent_datetime = NOW() WHERE id = ?`, [p.id]);
      // Email notifications
      emailConversionStatusUpdate(p.id);

      // Close the browser..
      puppet.closeBrowser();

      return "OK";
    }
    catch(error)
    {
      let message = "Exception in smsCodeConfirmation<br/><br/>"+error.message;
      Meteor.call("sendEmail",{
        name:"AUTOPAY",
        email:"support@fastx.io",
        subject:"Error in smsCodeConfirmation",
        message
      });
      throw error;
    }*/
  }
}