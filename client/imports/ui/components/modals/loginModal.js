import "../login.js";  //required to load the loginForm
import "../register.js"; //required to load the registerForm
import "./loginModal.html";

Template.loginModal.onCreated(function() {
    Session.set("showLogin", true);
});

Template.loginModal.onRendered(function() {
    $("#loginModal").modal("show");
});

Template.loginModal.helpers({
    showLogin() {
      return Session.get("showLogin");
    },

});

Template.loginModal.events({
    "click #showRegister"(e,tpl) {
        Session.set("showLogin",false);
    },
    "click #showLogin"(e,tpl) {
        Session.set("showLogin",true);
    }
});

Template.loginModal.onDestroyed(function() {
    $('.modal-backdrop').remove();
    $('body').removeClass('modal-open');
});