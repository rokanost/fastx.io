import "./service_status.html";

statuses = new Mongo.Collection("nodeStatuses");

Template.serviceStatus.onRendered(function(){
  window.prerenderReady = true;//Tell pre-render we are now ready
});

Template.serviceStatus.helpers({
  statuses() {
    return statuses.find();
  }
});