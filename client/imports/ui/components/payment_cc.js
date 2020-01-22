import braintree from "braintree-web";
import "./payment_cc.html";

Template.paymentCC.onCreated(function() {
  // Init braintree client
  braintree.client.create({
    authorization: 'production_rwf5npb6_dsb4ntr6xvw5rvtc',
  }, (err, clientInstance) => {
    this.BraintreClientInstance = clientInstance;
  });
});

Template.paymentCC.onRendered(function() {
});

Template.paymentCC.helpers({
  yearList() {
    let startYear = new Date().getFullYear();
    return _.range(startYear, startYear + 5);
  }
});

Template.paymentCC.events({
  "submit #paymentAdd"(e) {
    e.preventDefault();
    // Add a payment method

    // User check
    if(!user.findOne()) {
      return sAlert.error("Only logged in users can add a payment method.");
    }

    $(e.currentTarget).find('[type="submit"]').button('loading');

    let form = e.currentTarget;
    let data = {
      creditCard: {
        number: form['cc-number'].value,
        cvv: form['cc-cvv'].value,
        expirationMonth: form['cc-month'].value,
        expirationYear: form['cc-year'].value
      }
    };

    Template.instance().BraintreClientInstance.request({
      endpoint: 'payment_methods/credit_cards',
      method: 'post',
      data: data
    }, (requestErr, response) => {
      // More detailed example of handling API errors: https://codepen.io/braintree/pen/MbwjdM
      if (requestErr) {
        $(e.currentTarget).find('[type="submit"]').button('reset');
        return sAlert.error(requestErr);
      }

      let nonce = response.creditCards[0].nonce;
      if(nonce) {
        Meteor.call("addRandomAmountCheck", nonce, (err, res) => {
          $(e.currentTarget).find('[type="submit"]').button('reset');
          if(err)
            return sAlert.error(err.reason);
          // Success alert
          sAlert.success(`Success, a random amount has been deducted from your creditcard.`, {timeout: 'none'});
        });
      }
    });
  }
});
