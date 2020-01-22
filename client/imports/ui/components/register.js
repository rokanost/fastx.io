import "./register.html";
import "../pages/pwd_reset.js";

Template.registerForm.onCreated(function() {
  this.registrationCompleted = new ReactiveVar(false);
});

Template.registerForm.helpers({
  isRegistrationCompleted() {
    return Template.instance().registrationCompleted.get()
  }
});

Template.registerForm.events({

  "submit #register-form": function(event, tpl)
  {
    event.preventDefault();

    let captchaData = grecaptcha.getResponse();
    if(!captchaData) {
      sAlert.error("Please complete captcha verification");
      return;
    }

    $("#registerBtn").button("loading");

    Meteor.call("createUser", {
      email: $("#email").val(),
      user_uuid: Session.get("user_uuid"),
      password: $("#password").val(),
      captchaData
    }, function(error, result) {
      $("#registerBtn").button("reset");
      if(error) {
        grecaptcha.reset();
        $("#password").val("");
        sAlert.error(error.reason);
        Session.set("showLogin",true);
        return;
      }
      // Success
      tpl.registrationCompleted.set(true);
    });
  }

});
