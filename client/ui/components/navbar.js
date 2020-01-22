let loaded = false;
Template.navbar.onRendered(function() {
  $('.nav a:not(.dropdown-toggle)').on('click', function() {
      $('.navbar-collapse').collapse('hide');
  });
  // Jobs log
  if(!loaded)
    console.log(
      '%cAre you an experienced JS developer? If you are passionate about crypto, send your CV to jobs@fastx.io and include an example of your favourite project.',
      'color: #143a54; font-size:20px; font-weight:bold');

  loaded = true;
});

Template.navbar.helpers({
  isActive(page) {
    return Router.current().url.split("/").pop() === page ? "active" : ""
  },
  notLoggedIn(){
    return (user && user.findOne() ? false : true);
  }
});

Template.navbar.events({
  "click #logout"(e) {
    $(e.currentTarget).button('loading');
    Meteor.call("logout", () => {
      Session.set("token", null);
      sAlert.success("You have logged out.")
    });
  }
})
