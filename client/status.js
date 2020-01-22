let retryTime = new ReactiveVar(0);
let retryHandle = null;

let clearRetryInterval = function () {
  clearInterval(retryHandle)
  retryHandle = null
};

Template.status.onCreated(function() {
  this.autorun(function () {
    if(Meteor.status().status === "waiting")
    {
      retryHandle = retryHandle || setInterval(function () {
        let timeDiff   = Meteor.status().retryTime - (new Date).getTime()
        let _retryTime = timeDiff > 0 && Math.round(timeDiff / 1000) || 0

        retryTime.set(_retryTime)
      }, 500)
    }
    else
    {
      clearRetryInterval();
    }
  })
});

Template.status.onDestroyed(clearRetryInterval);

Template.status.helpers({
  status() {
    return Meteor.status().status
  },
  retryTime() {
    return retryTime.get()
  }
});

Template.registerHelper("isNotConnected", function() {
  return !Meteor.status().connected && Meteor.status().retryCount > 0
});
