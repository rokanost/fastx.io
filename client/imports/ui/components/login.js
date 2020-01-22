import "./login.html";
import './forgot_pwd.js';
import '../pages/pwd_reset.js';

Template.loginForm.onCreated(function(){
  this.pwdRstClicked = new ReactiveVar(false);
});

Template.loginForm.helpers({
  isPwdRstClicked(){
    return Template.instance().pwdRstClicked.get();
  }
});

Template.loginForm.events({
  "click #forgotPassword": function(e,tpl){
    tpl.pwdRstClicked.set(true);
  },
  "click #backToLogin": function(e,tpl){
    tpl.pwdRstClicked.set(false);
  },
  "submit #login-form": function(event, tpl)
  {
    event.preventDefault();
    event.stopPropagation();

    let captchaData = grecaptcha.getResponse();
    if(!captchaData) {
      sAlert.error("Please complete captcha verification");
      return;
    }


    $('[type="submit"]').button("loading");

    let params = {
      email     : $("#email").val(),
      password  : $("#password").val(),
      captchaData
    };

    Meteor.call("login", params, function(error,result) {
      $('[type="submit"]').button("reset");
      grecaptcha.reset();
      if(error)
      {
        sAlert.error("Login failed: "+error.reason);
        return;
      }

      if(!result) {
        sAlert.error("Username or password is incorrect.");
      }
      else
      {
          // user
          Session.set("user_uuid", result.uuid);
          // session
          Session.set("token", result.token);

          sAlert.success("Login successful.", {timeout: 3000});
      }
    });
  }
});
