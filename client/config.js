Router.configure({
  layoutTemplate: 'indexLayout',
  loadingTemplate: 'loader',
  notFoundTemplate: 'notFound',
  waitOn: function () {
    return [
      Meteor.subscribe("cryptos"),
      Meteor.subscribe("currencies"),
      Meteor.subscribe("countries"),
      Meteor.subscribe("settings"),
      Meteor.subscribe("user")
    ]
  }
});

Router.onBeforeAction(function() {
  // Scroll reset
  window.scroll({
    top: 0, 
    left: 0
  });
  // Maintenance check
  if(settings.findOne({name: "maintenance"}, {reactive: false}).value == 1)
  {
    import "./imports/ui/pages/maintenance.html";
    this.layout('indexLayout');
    this.render("maintenance");
    return;
  }
  this.next();
});

sAlert.config({
  effect: 'stackslide',
  stack: false,
  timeout: 7000,
  position: 'bottom'
});

reCAPTCHA.config({
  publickey: Meteor.settings.public.RECAPTCHA_PUBLIC_KEY
});
