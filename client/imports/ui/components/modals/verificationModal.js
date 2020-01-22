
import "./verificationModal.html";

let VERIFICATION_SOURCE_NAMES = {
  "nswrego": "NSW driver's licence",
  "qldrego": "QLD driver's licence",
  "sarego": "SA driver's licence",
  "warego": "WA driver's licence",
  "vicrego": "VIC driver's licence",
  "visa": "Passport - Australian visa",
  "aec": "Australian electoral roll"
}

Template.verificationModal.onCreated(function() {
  this.addressObj = {};

  // Manual KYC
  this.selectedDocument = new ReactiveVar();

  // Step 1 - default
  this.step = new ReactiveVar(1);

  this.autorun(() => {
    let u = user.findOne();
    if(u) 
    {
      // Step 2 - in progress
      if(u.kyc_status === "IN_PROGRESS") 
      {
        this.step.set(2);
      } 
        else 
      {
        this.step.set(1);
      }
    }
  });

});

Template.verificationModal.onRendered(function() {
  this.autorun(() => {
      if (GoogleMaps.loaded()) 
      {
        let input = document.getElementById('address');
        if(!input) return;
        
        let autocomplete = new google.maps.places.Autocomplete(input, 
        {
          types: ['address'],
          componentRestrictions: {country:["AU"]}
        });

        let componentForm = {
          street_number: 'short_name',
          route: 'long_name',
          locality: 'long_name',
          administrative_area_level_1: 'short_name',
          country: 'short_name',
          postal_code: 'short_name'
        };

        autocomplete.addListener('place_changed', () => {
          let tmpObj = {};
          let place = autocomplete.getPlace();
          if (place.geometry) {
            for (let i = 0; i < place.address_components.length; i++) {
              let addressType = place.address_components[i].types[0];
              let val = place.address_components[i][componentForm[addressType]];
              tmpObj[addressType] = val;
            }

            let addressObj = {
              streetNumber: tmpObj.street_number,
              streetName: tmpObj.route, // blues point road
              suburb  : tmpObj.administrative_area_level_2 || tmpObj.locality, //North Sydney
              state   : tmpObj.administrative_area_level_1, //NSW
              postcode: tmpObj.postal_code,  //2060
              country : tmpObj.country //AU
            };

            //Check address elements
            if(CheckAddress(addressObj)) this.addressObj = addressObj;     
          }
        });
      }
  });
  $("#verificationModal").modal('show');
});

//Helpers
Template.verificationModal.helpers({
  step() {
    return Template.instance().step.get();
  },
  documentsList() {
    return _.map(DOC_TYPES, (label,name) => ({
      name,
      label
    }));
  },
  selectedDocument() {
    return Template.instance().selectedDocument.get()
  },
  levelTpl() {
    // which KYC level form to show
    let type_id = conversions.findOne().type_id;
    let req = TYPE_VERIFICATION_LEVEL_REQUIRED[type_id];
    let u = user.findOne();

    if(u) {
      if(req > u.kyc_level) {
        return u.kyc_level + 1;
      }
    }
    
    // default
    return 1;
  }
});

//Events
Template.verificationModal.events({
  "click #documentsList li"(e,tpl) {
    tpl.selectedDocument.set(this);
  },

  "submit form#personal-info"(e,tpl) {
    e.preventDefault();

    switch (tpl.step.get()) {
      case 1:
        // Step 1
        // Check address elements
        if(!CheckAddress(tpl.addressObj))
        return;

        $("#registerBtn").button("loading");

        Meteor.call("registerManualVerification", {
          first_name:    $("#first_name").val(),
          last_name:     $("#last_name").val(),
          dob:           new Date($("#dob").val()),
          address_obj:   tpl.addressObj
        }, (er, res) => {
          $("#registerBtn").button("reset");
          if(er) return sAlert.error(er.reason);
          // Move to the next step
          tpl.step.set(2);
        });
      break;
    
      case 2:
        // Step 2
        // Manual
        let docs = []; // TODO
        let file = tpl.find('[type="file"]').files[0];
        $("#registerBtn").button("loading");
        imageReader(file, (res) => {
          if(!res.success) {
            // Error
            $("#registerBtn").button("reset");
            return sAlert.error(res.response); 
          }
          // Success, continue...
          docs.push({
            type: tpl.selectedDocument.get().name,
            img: res.response
          });
          Meteor.call("uploadDocuments", docs, (er, res) => {
            if(er) return sAlert.error(er.reason);
          });
        });
      break;
    }
  },

  "submit form#amount-confirm"(e) {
    e.preventDefault();
    let randomAmount = parseFloat($('#random_amount').val().replace(",", "."));
    Meteor.call("confirmRandomAmount", randomAmount, (er, res) => {
      if(er) return sAlert.error(er.reason);
      sAlert.success("Great! You now have a verified payment method.");
    });
  }

});

Template.verificationModal.onDestroyed(function() {
  $('.modal-backdrop').remove();
  $('body').removeClass('modal-open');
});