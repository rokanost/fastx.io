import './forgot_pwd.html';

Template.forgot_pwd.events({

  "submit #reset-pwd-form": function(event) {
    event.preventDefault();
    event.stopPropagation();

    let email = $("#forgot_email").val();
    Meteor.call("sendResetPasswordEmail", email);

    $("#resetSent").fadeIn();
    setTimeout(() => {
      $("#resetSent").fadeOut()
    }, 7000);
  }

});
