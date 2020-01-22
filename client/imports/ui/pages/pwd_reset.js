import "./pwd_reset.html";
import "../styles/pwd_reset.less";

Template.pwd_reset.onRendered(function(){
  window.prerenderReady = true;//Tell pre-render we are now ready
});

Template.pwd_reset.onCreated(function() {
  this.verification_token = this.data.verification_token;
});

Template.pwd_reset.events({
  "click #rstPwdBtn": function(event,tpl)
  {
    let captchaData = grecaptcha.getResponse();
    if(!captchaData) {
      sAlert.error("Please complete captcha verification");
      return;
    }

    let p = {
      password: $("#password").val(),
      verification_token: tpl.verification_token
    };

    $("#rstPwdBtn").button("loading");
    Meteor.call("updatePassword", p, function(error,result){
      if(error) {
        $("#rstPwdBtn").button("reset");
        sAlert.error(error);
      } else {
        sAlert.success("Password updated successfully. You can now login.", {onRouteClose: false, timeout: 5000});
        Router.go('login');
      }
    });
  }
});


//pwd_change_template
Template.pwd_change_template.onCreated(function() {
  this.hidePwd = new ReactiveVar(true);
});

Template.pwd_change_template.helpers({
  hidePassword() {
    return Template.instance().hidePwd.get();
  }
});

Template.pwd_change_template.events({

    "keyup": function(e,tpl)
    {
      let pass = $("#password").val();
      if(pass.length > 0) {
        let result = validatePassword(pass,pass);
        let passwordTips = "";

        if  (!result.lowerCase) passwordTips = "Include: Lowercase character";
        else if (!result.upperCase) passwordTips = "Include: Uppercase character";
        else if(!result.minLength) passwordTips = "Include: at least 8 characters";
        else if (!result.maxLength) passwordTips = "Maximum length 100 characters";

        if(passwordTips != "")
          $("#passwordTips").html(passwordTips);
        else
          $("#passwordTips").html("");

        if(result.minLength && result.maxLength && result.lowerCase && result.upperCase && result.hasNumber && result.pwdsMatch)
          $("#rstPwdBtn").prop('disabled', false);
        else
          $("#rstPwdBtn").prop('disabled', true);
      }
    },
    "click #eye":(e,tpl)=>{
      tpl.hidePwd.set(!tpl.hidePwd.get());
    },
    "click #captcha":(e,tpl)=>{
      tpl.hidePwd.set(true);
    }

  });

  //Ensure password meets minimum security requirements
  validatePassword = function(password,repeatPassword)
  {
    let result = {
      minLength: false,
      maxLength: false,
      lowerCase: false,
      upperCase: false,
      pwdsMatch: false,
      hasNumber: false
    };

    (password.length >= 8) ? result.minLength = true : result.minLength = false;
    (password.length <= 255) ? result.maxLength = true : result.maxLength = false;
    (password == repeatPassword) ? result.pwdsMatch = true : result.pwdsMatch = false;
    for(i=0; i<password.length; i++)
    {
      if('A' <= password[i] && password[i] <= 'Z') // check if you have an uppercase
          result.upperCase = true;
      if('a' <= password[i] && password[i] <= 'z') // check if you have a lowercase
          result.lowerCase = true;
      if('0' <= password[i] && password[i] <= '9') // check if you have a numeric
          result.hasNumber = true;
    }

    return result;
  }
