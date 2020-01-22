import "./tick.html";
import "./conversion.html";
import "./modals/verificationModal.js";
import "./modals/loginModal.js";
import "./payment_cc.js";

global.Buffer = global.Buffer || require("buffer").Buffer;
import QRCode from "qrcode";

// QRimage
Template.QRimage.onCreated(function(){
  this.QRimage = new ReactiveVar("");
});

Template.QRimage.onRendered(function(){
  this.autorun(() => {
    let c = conversions.findOne();
    // Check if input is crypto
    if([1,2].indexOf(c.type_id) > -1)
    {
      // Pending crypto transfer...
      let action = cryptos.findOne({crypto_code: c.input_code}).crypto_name.toLowerCase().replace(/ /g, '');
      let QRtext = action+":"+c.input_address+"?amount="+c.input_amount+"&label=FastX";
      QRCode.toDataURL(QRtext, {
        margin: 0,
        width: 150
      }).then(data => {
        this.QRimage.set(data);
      });
    }
  });
});

Template.QRimage.helpers({
  QRimage(){
    return Template.instance().QRimage.get();
  }
});

Template.conversion.onCreated(function() {
  this.showPayId = new ReactiveVar(false);
});

// Conversion
Template.conversion.helpers({
  showPayId() {
    return Template.instance().showPayId.get();
  },
  getTemplateStatus(){
    return "status_"+conversions.findOne().status_id;
  },
  modalToShow() {
    if (isVerificationRequired()) {
      if(!user.findOne()) {
        return "loginModal";
      }
      return "verificationModal";
    }
    return false;
  },
  conversion() {
    return conversions.findOne();
  },
  isCryptoInput() {
    return [1,2].indexOf(this.type_id) > -1;
  }
});

Template.conversion.events({
  "submit form#payment"(e,tpl) {
    e.preventDefault();
    let c = conversions.findOne();
    $('[type="submit"]').button("loading");
    const payment_type = $('[name=payment_method]:checked').val();
    if(!payment_type) 
      return sAlert.error("Please select a payment type");

    Meteor.call("processSale", {
      uuid: c.uuid,
      payment_type
    }, (er,res) => {
      if(er) {
        $('[type="submit"]').button("reset");
        return sAlert.error(er.reason);
      }

      if(payment_type === "payid") {
        tpl.showPayId.set(true);
        Meteor.setTimeout(() => {
          payid.init({
              payIdContainerId: "#payid-block",
              token: res.token
          });
        }, 10);
        return;
      }  

      sAlert.success("Success! Payment completed");
    })
  }
});

//STATUS 1
Template.status_1.onRendered(function() {
  $('[data-toggle="tooltip"]').tooltip({
    container: 'body', 
    trigger: 'hover',
    html: true
  });
});

Template.status_1.events({
  "click #changeTypeToQuick"(e) {
    e.preventDefault();
    let c = conversions.findOne();
    Meteor.call("changeConversionType", {
      user_uuid: Session.get("user_uuid"),
      conversion_uuid: c.uuid,
      is_precise: false
    }, (er,res) => {
      if(er) {
        sAlert.error(er.reason);
        return;
      }
      if(res) 
        sAlert.success("Success, conversion type has been changed.") 
    });
  }
});

Template.status_1.helpers({
  missingPendingAmount() {
    let c = conversions.findOne();
    let diff = (c.pending_balance - c.input_amount).toFixed(8);
    return c.is_precise && c.pending_balance > 0 && diff < 0 ? -diff : false;
  }
});

//STATUS 3
Template.status_3.onRendered(function(){
    Meteor.setTimeout(() => {
      $(".trigger").addClass("drawn");
    }, 500);
});

function isVerificationRequired() 
{
  const conversion = conversions.findOne();
  const type_id = conversion.type_id;
  const req_level = TYPE_VERIFICATION_LEVEL_REQUIRED[type_id];
  // Not required for c/c or if user has been verified already
  if(req_level === 0 || conversion.kyc_level >= req_level) 
    return false;
 
  // Otherwise, check if user
  return !(user.findOne() && user.findOne().kyc_level >= req_level);
}
