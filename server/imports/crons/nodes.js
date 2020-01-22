import providers from '../providers.js';

// Init statuses
_.each(providers, (p,k) => {
  nodeStatuses.insert({
    _id: k,
    name: k,
    on: false,
    pending: true,
    retries: 0
  }); 
});

Meteor.methods({
  checkNodes() {

    if(!isAdmin(this.userId) && this.connection) 
    throw new Meteor.Error("isAdmin","Access-denied");

    _.each(providers, (p,k) => {
      
      // Disabled for now
      if(k == "NANO") return;

      let node = nodeStatuses.findOne({_id: k});
      let on = false;
      try 
      {
        let addr = createCryptoAddress({id: 99999999, crypto_code: k});
        on = p.getBalance(addr) >= 0 ? true : false;

      } catch(e) {
        console.log("nodeStatuses:", e);
      }

      if(!on && node.retries === 3) {
        // Email support about the node if failed 3 times in a row
        Meteor.defer(() => {
          Email.send({
            to: "support@fastx.io",
            from: FROM_ADDR,
            subject: k+" node is down!",
            html: emailLayout("Please investigate ASAP!")
          });
        });
      }

      nodeStatuses.update({_id: k}, {
        $set: {
          // Node is still considered on
          // unless check failed 3 times in a row
          on: node.retries >= 3 ? on : true, 
          pending: false, 
          retries: !on ? node.retries+1 : 0
        }
      });

    });
  }
});


SyncedCron.add({
  name: 'nodeStatuses',
  schedule: function(parser) {
	   return parser.text('every 2 minutes');
  },
  job: function() {
    if(!!SETTINGS['maintenance']) return false;
    Meteor.call("checkNodes");
    return true;
  }
});

// Run 10s after init
if(isProductionDomain)
Meteor.setTimeout(() => {
  Meteor.call("checkNodes");
}, 10*1000);