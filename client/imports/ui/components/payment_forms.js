import "./payment_forms.html";

////////////////// AUSTRALIA ///////////////////
Template.paymentForm_AU.onCreated(function() {
  this.bank_name = new ReactiveVar("");
  this.bpay_alias = new ReactiveVar("");
});

Template.paymentForm_AU.helpers({
  lastConversion(type) {
    let filter = {currency_code: "AUD"};

    switch (type) {
      case "BPAY":
        filter.bpay_biller_code = {$ne: null}
      break;

      case "PAYID":
        filter.payid = {$ne: null}
      break;

      default:
        // BANK (default)
        filter.number = null;
      break;
    }
    
    return bank_info.findOne(filter, {sort: {datetime: -1}}) || {}
  },
  bank_name() {
    return Template.instance().bank_name.get()
  },
  bpay_alias() {
    return Template.instance().bpay_alias.get()
  }
});

Template.paymentForm_AU.events({
  "input #bsb": function(e, tpl) {
    // Prevent any items over 6 characters
    let bsb = e.currentTarget.value;

    if(bsb.length > 6)
      return;

    // Check for Bank account
    let bank = BSB_NUMBERS[bsb.substring(0,2)];
    if(!bank)
      bank = BSB_NUMBERS[bsb.substring(0,3)];

    if(bank)
      tpl.bank_name.set(bank);
    else
      tpl.bank_name.set("");
  },

  "keyup #bpay_biller_code, blur #bpay_biller_code": _.debounce(function(e, tpl) {
    let biller_code = e.currentTarget.value;
    if(biller_code.length >= 4)
    {
      Meteor.call("getBpayDetails", parseInt(biller_code), function(error, result) {
        if(error) return sAlert.error(error.reason);
        tpl.bpay_alias.set(result);
      });
    }
  }, 1000),

  "keydown #bpay_biller_code"(e, tpl) {
    // Clear only on backspace
    if(e.keyCode === 8)
      tpl.bpay_alias.set("");
  }
});

///////////////// United States of America ///////////////
Template.paymentForm_US.helpers({
  lastConversion() {
    return bank_info.findOne({output_code: "USD"}, {sort: {datetime: -1}}) || {}
  }
});

/////////////// EUROPE /////////////////
Template.paymentForm_LT.helpers({
  lastConversion() {
    return bank_info.findOne({output_code: "EUR", country_code: "LT"}, {sort: {datetime: -1}}) || {}
  }
});
/////////////// EUROPE /////////////////
Template.paymentForm_DE.helpers({
  lastConversion() {
    return bank_info.findOne({output_code: "EUR", country_code: "DE"}, {sort: {datetime: -1}}) || {}
  }
});

////////// CRYPTO OUTPUT ///////////
Template.cryptoOutputForm.helpers({
  lastWalletUsed() {
    let crypto_code = Template.instance().data.codeTo;
    return wallet_info.findOne({crypto_code}, {sort: {updated: -1}}) || {}
  },
  cryptoCode() {
    return Template.instance().data.codeTo;
  },
  isCryptoInput() {
    let typeId = getCoversionTypeId(
      Template.instance().data.codeFrom,
      Template.instance().data.codeTo
    );
    return [1,2].indexOf(typeId) > -1;
  }
});
