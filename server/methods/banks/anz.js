anz = {

    loggedIn: false,
    insideNewPayment: null, // Will prevent refresh tx list cron until tx is sms confirmed
    smsVerifiedConversion: null,

    login: function() {
        // 1) LOGIN
        try 
        {
            this.page = wait(puppet.browser.newPage());
            wait(this.page.goto('https://www.anz.com/INETBANK/login.asp'));
            wait(this.page.type('#crn', ANZ_CRN));
            wait(this.page.type('#Password', ANZ_PASSWORD));
            wait(this.page.click('#SignonButton'));
            wait(this.page.waitFor('#ANZAccessAdvantage a'));
            wait(delay(1000));
            this.loggedIn = true;

            return true;
        }
            catch(e) 
        {
            // Catch errors: (session expired?)
            this.loggedIn = false;
            return false;
        }
    },

    goHome() {
        wait(this.page.click('#icon-home'));
        this.insideNewPayment = null;
        return true;
    },

    newPayment: function({conversion_id, mobile, amount}) {
        if(!this.insideNewPayment) 
        {
            try 
            {   
                this.insideNewPayment = conversion_id;

                wait(this.page.click('#ANZAccessAdvantage a'));
                wait(this.page.waitFor('.paymentQuickLinksMainSubPA > a'));
                wait(delay(1000));
                wait(this.page.click('.paymentQuickLinksMainSubPA > a'));
                // Select from
                wait(this.page.waitFor('#fromAccOverlayId'));
                wait(delay(1000));
                wait(this.page.click('#fromAccOverlayId'));
                wait(this.page.waitFor('#fromAccount0'));
                wait(delay(1000));
                wait(this.page.click('#fromAccount0'));
                // Select to
                wait(delay(1000));
                wait(this.page.click('#toAccOverlayId'));
                wait(delay(1000));
                wait(this.page.waitFor('#AddNewPayeeBtn'));
                wait(delay(1000));
                wait(this.page.click('#AddNewPayeeBtn'));
                wait(this.page.waitFor('.phone-number'));
                wait(delay(1000));
                wait(this.page.click('.phone-number'));
                wait(this.page.type('#MobileNumberVal', mobile));
                wait(this.page.click('#save_mobile_number'));
                wait(delay(1000));
                wait(this.page.type('#Txn_Amt', amount.toString()));
                wait(this.page.type('#userName', "FastX"));
                wait(this.page.click('#review_details'));
                wait(this.page.waitFor('#Confirm'));
                wait(this.page.click('#Confirm'));

                try 
                {
                    // Payment completed
                    wait(this.page.waitFor('#PaymentsubmittedID', { timeout: 5000 }));           
                    return true;
                    
                } catch(e) {

                    // SMS verification required
                    wait(this.page.waitFor('#SMSVerfication_Continue'));
                    wait(delay(1000));
                    wait(this.page.click('#SMSVerfication_Continue'));
                    
                    return wait(new Promise(resolve => {
                        // Check for SMS verification completion...
                        this.interval = Meteor.setInterval(() => {
                            if(this.smsVerifiedConversion === conversion_id) {
                                resolve(true);
                                // Clear interval & timeout when done
                                Meteor.clearInterval(this.interval);
                                this.interval = null;
                                Meteor.clearTimeout(this.timeout);
                                this.timeout = null;
                            }
                        }, 1000);

                         // If sms not received within 60 seconds, 
                        // there's something wrong going on...
                        this.timeout = Meteor.setTimeout(() => {
                            if(this.interval) {
                                Meteor.clearInterval(this.interval);
                                resolve(false);
                                this.goHome();
                            }
                        }, 60*1000);
                    }))
                }

            } 
                catch (e) 
            {
                console.log(e);
                this.goHome();

                return false;
            }
        }
    },

    SMSverification: function(code) {
        if(this.insideNewPayment) 
        {
            try {
                wait(this.page.type('#otpbox_1', code[0]));
                wait(this.page.type('#otpbox_2', code[1]));
                wait(this.page.type('#otpbox_3', code[2]));
                wait(this.page.type('#otpbox_4', code[3]));
                wait(this.page.type('#otpbox_5', code[4]));
                wait(this.page.type('#otpbox_6', code[5]));
                wait(delay(1000));
                wait(this.page.click('#Continue'));
                wait(this.page.waitFor('#PaymentsubmittedID'));

                // Set as verified
                this.smsVerifiedConversion = this.insideNewPayment;
  
                return true;

            } catch (e) {
                console.log(e);
            }
        }

        return false;
    },

    getLatestNPPTransactions() {
        if(!this.insideNewPayment) 
        {
            wait(this.page.click('#ANZAccessAdvantage a'));
            wait(this.page.waitFor('#content-txn-hist-id'));
            wait(delay(1000));

            const list = wait(this.page.evaluate(() => jsonStringProcessedTxns));
            // Always go back to main page after we done selecting what we need
            this.goHome();

            let txs = [];
            _.each(list, t => {
                if(t.TxnTypID === "NPP") 
                {
                    txs.push({
                        puId: t.puId,
                        paidTo: t.paidToAlais,
                        amount: t.getTxnAmt,
                        reference: t.extendedNarrative,
                        currency: t.amountCurrencyCode
                    });
                }
            });

            return txs;
        }

        // Returns empty..
        // we are in the middle a new payment process
        console.log("Warning: new payment is being processed..");
        return [];
    }
}