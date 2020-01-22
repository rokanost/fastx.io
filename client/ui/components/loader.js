Template.loader.helpers({
  getLoadingText() {
    //Randomly return a loading message
    let msgs = [
      "Loading resources",
      "Gathering information",
      "Waiting for server"
    ];

    return msgs[Math.floor(Math.random()*msgs.length)];
  }
});
