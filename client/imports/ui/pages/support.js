import "./support.html";

Template.support.onRendered(function() {
  window.prerenderReady = true;//Tell pre-render we are now ready
});


Template.support.events({

    "submit #support-form": function( event )
    {
      event.preventDefault();
      event.stopPropagation();

      let captchaData = grecaptcha.getResponse();
      if(!captchaData) {
        sAlert.error("Please complete captcha verification");
        return;
      }

      $("#support-form-submit").button('loading');

      var p = {
        "name" : $("#name").val(),
        "email" : $("#email").val(),
        "subject" : $("#subject").val(),
        "message" : $("#message").val(),
        captchaData
      };


      Meteor.call("sendEmailClient", p, function(error,result) {

        $("#support-form-submit").button('reset');
        grecaptcha.reset();
        if(error)
        {
          sAlert.error("Failed: "+error.reason);
          return;
        }

        if(!result) {
          sAlert.error("Could not send email.. please try sending manually.");
        } else {
          sAlert.success("Success! Thank you for your email, we will be in touch shortly.");
        }
      });

      return false;
    }

  });
