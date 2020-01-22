import "./manual_verify.html";

Template.manual_verify.onCreated(function() {
  this.subscribe("kyc_documents");
  Meteor.call("getImageVector", (er,res) => {
    if(er) sAlert.error(er.reason);
    Session.set("IMAGE_VECTOR", res);
  });
});

Template.manual_verify.helpers({
  settings() {
    return {
      collection: users.find({first_name: {$ne: null}}),
      rowsPerPage: 10,
      showFilter: true,
      fields: [
        { key: 'first_name', label: 'First name' },
        { key: 'last_name', label: 'Last name'},
        { key: 'dob', label: 'DOB' },
        { key: 'address', label: 'Address' },
        { key: 'kyc_level', label: 'KYC lvl' },
        { key: 'timestamp', label: 'Created', sortOrder: 0, sortDirection: 'descending' },
        { key: 'id', label: 'Documents', fn: (user_id, obj) => {
          return Spacebars.SafeString(
            _.map(kyc_documents.find({user_id}).fetch(), doc => {
              return `<div class="row margin-top-10">
                  <div class="col-xs-6">
                    Type: `+doc.type+`<br />
                    Status: `+(doc.verified ? `Verified` : `Pending<br /><button class="btn btn-xs btn-primary confirm" data-id="`+doc.id+`">Verify</button>`)+`
                  </div>
                  <div class="col-xs-6">
                    `+ decryptImage(doc.img) +`
                  </div>
                </div>`
            }).join("")
          );
        }}
      ]
    }
  }
});

Template.manual_verify.events({
  "click button.confirm"(e) {
    let docId = parseInt($(e.currentTarget).data('id'));
    $(e.currentTarget).button('loading');
    Meteor.call("verifyDocument", docId, function(err,res) {
      if(err) {
        $(e.currentTarget).button('reset');
        sAlert.error(err.reason);
      }
    });
  }
});

decryptImage = (img) => {
  if(!Session.get("IMAGE_VECTOR")) return "Locked";
  let decoded = CryptoJS.AES.decrypt(img, Session.get("IMAGE_VECTOR")).toString(CryptoJS.enc.Utf8);
  return `<img src="data:image/png;base64,`+decoded+`" style="max-width: 100px;">`
}