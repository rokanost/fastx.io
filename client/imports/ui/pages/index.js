import "./index.html";
import "./index.landing.html";
import "../components/payment_forms.js";
import "../styles/index.less";
import "../styles/steps.less";

import timeago from 'timeago.js';
import Typed from 'typed.js';

let methods = [
  { name: "Quick", title: "Convert any amount between allowed limits.", placement: "top" },
  { name: "Precise", title: "Receive an exact amount. Used for specific outcome.", placement: "top" }
];

let dirtyField = "inputAmount"; // Default
const defaultPayment = "PAYID";

Template.index.onCreated(function() {
  this.action               = new ReactiveVar(""); // BUY/SELL
  this.inputAmount          = new ReactiveVar("");
  this.outputAmount         = new ReactiveVar("");
  this.isPrecise            = new ReactiveVar(false);

  switch (this.data.action) {
    case "buy":
      this.data.codeFrom = "AUD";
    break;
    case "sell":
      this.data.codeTo = "AUD";
    break;
  }

  this.codeFrom             = new ReactiveVar(this.data.codeFrom || "AUD");
  this.codeTo               = new ReactiveVar(this.data.codeTo || "BTC");

  // Get country code by currency code
  let country = countries.findOne({currency_code: this.codeTo.curValue});
  this.selectedCountry      = new ReactiveVar(country ? country.country_code : "AU");
  this.selectedPayment      = new ReactiveVar(defaultPayment);

  this.data.title = new ReactiveVar();
  this.data.subTitle = new ReactiveVar();

  this.autorun(() => {
    this.codeFrom.get();
    this.codeTo.get();
    let cFrom = cryptos.findOne({crypto_code: this.codeFrom.curValue});
    let cTo = cryptos.findOne({crypto_code: this.codeTo.curValue});
    switch (this.data.action) {
      case "buy":
        this.data.title.set(Spacebars.SafeString("<b>Buy "+cTo.crypto_name+"</b>"));
        this.data.subTitle.set(cTo.description);
      break;
      case "sell":
        this.data.title.set(Spacebars.SafeString("<b>Sell "+cFrom.crypto_name+"</b>"));
        this.data.subTitle.set(cFrom.description);
      break;
      case "trade":
        this.data.title.set(Spacebars.SafeString("<b>Trade "+cFrom.crypto_name+" to "+cTo.crypto_name+"</b>"));
        this.data.subTitle.set(cFrom.description);
      break;
    }
  });
});

Template.index.onRendered(function() {
  if(!this.data.codeTo && !this.data.codeFrom) 
  {
    // let typedSubtitle = new Typed("#subTitle", {
    //   strings: _.shuffle([
    //     "PayID payments accepted.",
    //     "Convert crypto to AUD and vice versa.",
    //     "Easy verification process.",
    //     "No fees.",
    //     "Live market rates."
    //   ]),
    //   typeSpeed: 30,
    //   backSpeed: 10,
    //   backDelay: 2000,
    //   loop: true,
    // });

    /*let typedBuySell = new Typed("#typeLoop", {
      strings: ["Buy", "Sell"],
      typeSpeed: 60,
      backSpeed: 30,
      backDelay: 3000,
      loop: true,
      showCursor: false
    });

    let typedCryptos = new Typed("#cryptoLoop", {
      strings: _.shuffle(cryptos.find().fetch().map(c => c.crypto_name)),
      typeSpeed: 60,
      backSpeed: 30,
      backDelay: 3000,
      loop: true,
      showCursor: true
    });*/
  }

  // disable Number input Scroll
  $('[type="number"]').on('focus', function(e) {
    $(this).on('mousewheel.disableScroll', function (e) {
      e.preventDefault();
    })
  });

  $('[data-toggle="tooltip"]').tooltip({container: 'body', trigger: 'hover'});

  window.prerenderReady = true; //Tell pre-render we are now ready
});

Template.index.helpers({
  action() {
    return Template.instance().action.get()
  },
  currenciesAndCryptos() {
    const action = Template.instance().action.get();
    // Hide currency we are buying or selling
    const curr = Template.instance()[action === "BUY" ? "codeTo" : "codeFrom"].get();
    const merged = currencies.find().fetch().concat(cryptos.find({crypto_code: {$ne: curr}}).fetch());
    
    return _.map(merged, r => ({
      code: r.crypto_code || r.currency_code,
      name: r.crypto_name || r.currency_code,
    }));
  },
  inputAmount() {
    return Template.instance().inputAmount.get()
  },
  outputAmount() {
    return Template.instance().outputAmount.get()
  },
  currentRate() {
    let codeFrom = Template.instance().codeFrom.get();
    let codeTo = Template.instance().codeTo.get();
    return getRate({codeFrom, codeTo});
  },
  decimalsTo() {
    let c = cryptos.findOne({crypto_code: Template.instance().codeTo.get()});
    return c ? c.decimals : 2;  
  },
  decimalsFrom() {
    let c = cryptos.findOne({crypto_code: Template.instance().codeFrom.get()});
    return c ? c.decimals : 2;  
  },
  codeFrom() {
    return Template.instance().codeFrom.get();
  },
  codeTo() {
    return Template.instance().codeTo.get();
  },
  methods() {
    return methods;
  },
  selectedMethod() {
    return methods[Template.instance().isPrecise.get() ? 1 : 0]
  },
  conversionType() {
    return getCoversionTypeId(
      Template.instance().codeFrom.get(),
      Template.instance().codeTo.get()
    );
  },
  isCryptoOutput() {
    let typeId = getCoversionTypeId(
      Template.instance().codeFrom.get(),
      Template.instance().codeTo.get()
    );
    return [2,3].indexOf(typeId) > -1;
  },
  selectedPayment() {
    let country = Template.instance().selectedCountry.get();
    let paymentType = Template.instance().selectedPayment.get();
    return _.find(PAYMENT_TYPES[country], p => p.type === paymentType);
  },
  paymentTypes() {
    let country = Template.instance().selectedCountry.get();
    return PAYMENT_TYPES[country];
  },
  selectedCountry() {
    let country = Template.instance().selectedCountry.get();
    return countries.findOne({country_code: country});
  },
  countries() {
    let currency = Template.instance().codeTo.get();
    return countries.find({currency_code: currency}).fetch();
  },
  paymentTemplate() {
    let country = Template.instance().selectedCountry.get();
    let paymentType = Template.instance().selectedPayment.get();
    let data = _.find(PAYMENT_TYPES[country], p => p.type === paymentType);
    return {
      name: "paymentForm_"+country,
      data
    }
  },
  conversions(showMineOnly) {
    return conversions.find({uuid: {$exists: !!showMineOnly}}, {sort: {datetime: -1}}).fetch().map(o => {
      // datetime.replace(/-/g, "/") safari parser fix
      o.time_ago = timeago().format(new Date(o.datetime.replace(/-/g, "/")+' UTC'));
      return o;
    });
  },
  rates() {

    const code_from = "AUD"; //Template.instance().codeFrom.get();
    const collection = conversion_rates.find({code_from})

    return {
      collection,
      class: 'table table-hover',
      fields: [
        {key: "code_to", label: "", fn: (code_to) => {
          const crypto = cryptos.findOne({crypto_code: code_to});
          return Spacebars.SafeString(
            `<img src="/images/icons/${code_to}.png" style="width:20px;"> <b>${crypto.crypto_name}</b>`
          )
        }},
        {key: "code_to", label: "Buy", fn: (code_to) => {
          return (1/conversion_rates.findOne({code_from, code_to}).rate).toFixed(2)
        }},
        {key: "code_to", label: "Sell", fn: (code_to) => {
          return conversion_rates.findOne({code_from: code_to, code_to: code_from}).rate.toFixed(2)
        }},
        {key: "code_to", label: "Action", fn: (code_to) => {
          return Spacebars.SafeString(`<button class="btn btn-sm btn-success" type="buy" code="${code_to}">BUY</button>
          <button class="btn btn-sm btn-danger" type="sell" code="${code_to}">SELL</button>`)
        }},
      ]
    }
  }
});

Template.index.events({

  "click #currencies button"(e,tpl) {
    e.preventDefault();
    tpl.codeFrom.set(this.currency_code);
    console.log(tpl.codeFrom.get(), tpl.codeTo.get(), tpl.action.get())
  },

  "click [type=buy]"(e,tpl) {
    e.preventDefault();
    const code = $(e.currentTarget).attr('code');
    if(code === tpl.codeFrom.get()) {
      tpl.codeFrom.set("AUD");
    }
    tpl.codeTo.set(code);
  },

  "click [type=sell]"(e,tpl) {
    e.preventDefault();
    const code = $(e.currentTarget).attr('code');
    if(code === tpl.codeTo.get()) {
      tpl.codeTo.set("AUD");
    }
    tpl.codeFrom.set(code);
  },

  // "click .action-btns a"(e,tpl) {
  //   e.preventDefault();
  //   tpl.codeFrom.set("");
  //   tpl.codeTo.set("");
  //   tpl.action.set(e.currentTarget.innerText);
  //   tpl.inputAmount.set("");
  //   tpl.outputAmount.set("");
  //   // Scroll
  //   Meteor.setTimeout(() => {
  //     document.querySelector('#step2').scrollIntoView({ 
  //       behavior: 'smooth' 
  //     });
  //   }, 100);
  // },

  // "click .crypto-btns a"(e,tpl) {
  //   // Find out what kind of input we clicked
  //   const x = tpl.action.get() === "BUY" ? "codeTo" : "codeFrom"
  //   const y = x == "codeTo" ? "codeFrom" : "codeTo";
  //   tpl[x].set(this.crypto_code)
  //   // Deselect next step if codes match
  //   if(tpl[x].curValue == tpl[y].curValue) tpl[y].set("");
  //   // Reset payment type
  //   tpl.selectedPayment.set(defaultPayment);
  //   const codeFrom = tpl.codeFrom.get() 
  //   const codeTo = tpl.codeTo.get()
  //   if(codeFrom && codeTo) 
  //   {
  //     // Get new amount depending on the dirty field
  //     let rate = getRate({
  //       codeFrom,
  //       codeTo,
  //       [dirtyField]: tpl[dirtyField].get()
  //     });
  //     tpl[dirtyField === "inputAmount" ? "outputAmount" : "inputAmount"].set(rate);
  //   }
  //   // Scroll
  //   Meteor.setTimeout(() => {
  //     document.querySelector('#step3').scrollIntoView({ 
  //       behavior: 'smooth' 
  //     });
  //   }, 100);
  // },

  // "click .currency-crypto-btns a"(e,tpl) {
  //   tpl[tpl.action.get() === "BUY" ? "codeFrom" : "codeTo"].set(this.code)
  //   // Reset payment type
  //   tpl.selectedPayment.set(defaultPayment);
  //   const codeFrom = tpl.codeFrom.get() 
  //   const codeTo = tpl.codeTo.get()
  //   if(codeFrom && codeTo) 
  //   {
  //     // Get new amount depending on the dirty field
  //     let rate = getRate({
  //       codeFrom,
  //       codeTo,
  //       [dirtyField]: tpl[dirtyField].get()
  //     });
  //     tpl[dirtyField === "inputAmount" ? "outputAmount" : "inputAmount"].set(rate);
  //   }

  //   // Scroll
  //   Meteor.setTimeout(() => {
  //     const inputId = "inputAmount"; //tpl.action.get() === "BUY" ? "inputAmount" : "outputAmount";
  //     document.getElementById(inputId).focus();
  //     document.querySelector('#step4').scrollIntoView({ 
  //       behavior: 'smooth' 
  //     });
  //   }, 100);
  // },

  "input #inputAmount"(e,tpl) {
    dirtyField = "inputAmount";
    let value = $(e.currentTarget).val();
    if(parseFloat(value) < 0) {
      tpl.inputAmount.set("");
      tpl.outputAmount.set("");
      return;
    }

    let codeFrom = Template.instance().codeFrom.get();
    let codeTo = Template.instance().codeTo.get();
    let rate = getRate({codeFrom, codeTo, inputAmount: value});

    tpl.inputAmount.set(value);
    tpl.outputAmount.set(rate);

    // init tooltip
    Meteor.setTimeout(() => {
      $('[data-toggle="tooltip"]').tooltip({container: 'body', trigger: 'hover'});
    }, 100);
  },

  "input #outputAmount"(e,tpl) {
    dirtyField = "outputAmount";
    let value = $(e.currentTarget).val();
    if(parseFloat(value) < 0) {
      tpl.outputAmount.set("");
      tpl.inputAmount.set("");
      return;
    }

    let codeFrom = Template.instance().codeFrom.get();
    let codeTo = Template.instance().codeTo.get();
    let rate = getRate({codeFrom, codeTo, outputAmount: value});

    tpl.outputAmount.set(value);
    tpl.inputAmount.set(rate);

    // init tooltip
    Meteor.setTimeout(() => {
      $('[data-toggle="tooltip"]').tooltip({container: 'body', trigger: 'hover'});
    }, 100);
  },

  // "click #from li:not(.divider)"(e, tpl) {
  //   // Swap if selected the same
  //   let c = this.crypto_code || this.currency_code;
  //   if(tpl.codeTo.get() === c) tpl.codeTo.set(tpl.codeFrom.curValue);
  //   tpl.selectedPayment.set(defaultPayment); // Reset payment type
  //   tpl.codeFrom.set(c);
  //   // Get new amount depending on the dirty field
  //   let rate = getRate({
  //     codeFrom: tpl.codeFrom.get(),
  //     codeTo: tpl.codeTo.get(),
  //     [dirtyField]: tpl[dirtyField].get()
  //   });
  //   tpl[dirtyField === "inputAmount" ? "outputAmount" : "inputAmount"].set(rate);
  // },

  // "click #to li:not(.divider)"(e, tpl) {
  //   // Swap if selected the same
  //   let c = this.crypto_code || this.currency_code;
  //   if(tpl.codeFrom.get() === c) tpl.codeFrom.set(tpl.codeTo.curValue);
  //   tpl.selectedPayment.set(defaultPayment); // Reset payment type
  //   // Reset country
  //   if(this.currency_code)
  //   {
  //     let country = countries.findOne({currency_code: this.currency_code});
  //     tpl.selectedCountry.set(country.country_code);
  //   }
  //   tpl.codeTo.set(this.crypto_code || this.currency_code);
  //   // Get new amount depending on the dirty field
  //   let rate = getRate({
  //     codeFrom: tpl.codeFrom.get(),
  //     codeTo: tpl.codeTo.get(),
  //     [dirtyField]: tpl[dirtyField].get()
  //   });
  //   tpl[dirtyField === "inputAmount" ? "outputAmount" : "inputAmount"].set(rate);
  // },

  "click [name=is_precise]"(e,tpl) {
    tpl.isPrecise.set(!!parseInt(e.currentTarget.value));
  },

  "click #countries li"(e, tpl) {
    tpl.selectedCountry.set(this.country_code);
  },

  "click #paymentType li"(e, tpl) {
    tpl.selectedPayment.set(this.type);
  },

  "submit form"(e,tpl) {
    e.preventDefault();
    e.stopPropagation();

    let selectedPayment = tpl.selectedPayment.get();
    let typeId = getCoversionTypeId(tpl.codeFrom.get(), tpl.codeTo.get());
    let country = tpl.selectedCountry.get();

    let params = {
      user_uuid:      Session.get("user_uuid"),
      input_code:     tpl.codeFrom.get(),
      output_code:    tpl.codeTo.get(),
      input_amount:   parseFloat($("#inputAmount").val()),
      is_precise:     tpl.isPrecise.get()
    }

    switch (typeId) {
      case 1: // Crypto to Fiat
      case 4: // Fiat to Fiat
        switch (selectedPayment) {
          case "BANK":
            params.bank = {
              country_code:     country,
              account_name:     $("#account_name").val(),
              number:           $("#number").val()
            }
            // BSB for Australia
            if(country === "AU")
              params.bank.bsb = $("#bsb").val();
            // Optional description
            let description = $("#description").val();
            if(description)
              params.bank.description = description;
          break;

          case "BPAY":
            params.bpay = {
              bpay_biller_code: $("#bpay_biller_code").val(),
              bpay_reference:   $("#bpay_reference").val()
            }
          break;

          case "PAYID":
            params.payid = {
              payid_type: "phone", //$("#payid_type").val(),
              payid:      $("#payid").val()
            }
          break;
        }
      break;

      case 2: // Crypto to Crypto
      case 3: // Fiat to Crypto
        selectedPayment = "CRYPTO";
        params.crypto = {
          output_address: $("#crypto_address").val()
        }
        // Optional refund address
        let refund_address = $("#refund_address").val();
        if(refund_address)
          params.crypto.refund_address = refund_address;
      break;
    }

    if(!validateForms(selectedPayment, params))
      return;

    $('[type="submit"]').button("loading");
    Meteor.call("createConversion", params, (error,result) => {
      if(error) {
        $('[type="submit"]').button("reset");
        return sAlert.error(error.reason);
      }
      Router.go("/conversion/"+result.uuid);
    });
  },

  "click .my-conversion"() {
    Router.go("/conversion/"+this.uuid);
  }
});

function getRate({codeFrom, codeTo, inputAmount, outputAmount}) {
    if(!codeFrom || !codeTo) return;

    let typeId = getCoversionTypeId(codeFrom, codeTo);
    let decimals = [1,4].indexOf(typeId) > -1 ? 2 : 8;

    let rate = conversion_rates.findOne({code_from: codeFrom, code_to: codeTo}).rate;
    if(inputAmount !== undefined)
    {
      // Output amount
      return inputAmount ? (rate * inputAmount).toFixed(decimals) : ""
    }
      else if(outputAmount !== undefined)
    {
      // Input amount
      decimals = [1,2].indexOf(typeId) > -1 ? 8 : 2;
      return outputAmount ? (1 / rate * outputAmount).toFixed(decimals) : ""
    }
      else
    {
      // Default rate
      return rate.toFixed(decimals);
    }
}


function validateForms(form, p){
  try
  {
    switch(form) {
      case "BANK":
        if(p.bank.country_code === "AU")
        {
          // Australia only
          _check(p.bank.bsb, NonEmptyStringCheck, "BSB cannot be empty");
          if (p.bank.bsb.length != BSB_CHARS)
          {
            throw "BSB must be "+BSB_CHARS+" characters";
          }
        }
        _check(p.bank.number, NonEmptyStringCheck, "Account number cannot be empty");
        if (p.bank.number.length > MAX_CHARS)
        {
          throw "Account number must be less than "+MAX_CHARS+" digits";
        }
        _check(p.bank.account_name, NonEmptyStringCheck, "Account name cannot be empty");
        if (p.bank.account_name.length > MAX_CHARS)
        {
          throw "Account name must be less than "+MAX_CHARS+" characters";
        }
        if (p.bank.description && p.bank.description.length > MAX_CHARS)
        {
          throw "Description must be less than "+MAX_CHARS+" characters";
        }
      break;

      case "BPAY":
        _check(p.bpay.bpay_biller_code, NonEmptyStringCheck, "Biller code cannot be empty");
        if (p.bpay.bpay_biller_code.length > MAX_CHARS)
        {
          throw "Biller code must be less than "+MAX_CHARS+" digits";
        }
        _check(p.bpay.bpay_reference, NonEmptyStringCheck, "Reference number cannot be empty");
        if (p.bpay.bpay_reference.length > MAX_CHARS)
        {
          throw "Reference number must be less than "+MAX_CHARS+" digits";
        }
      break;
      case "CRYPTO":
        _check(p.crypto.output_address, NonEmptyStringCheck, "Wallet address cannot be empty");
      break;
    }
    return true;
  }
    catch (e)
  {
    console.log(e);
    sAlert.error(e);
    return false;
  }
}
