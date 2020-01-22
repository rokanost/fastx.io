// USER UUID
let u_uuid = Session.get("user_uuid");
// user not found, create new..
if(!u_uuid) Session.set("user_uuid", uuid.new());


/// USER LOGIN
let token = Session.get("token");
if(token)
{
  // user token
  Meteor.call("loginWithToken", token, (er, res) => {
    if(res)
    {
      // set uuid
      let uuid = res.uuid;
      Session.set("user_uuid", uuid);
    }
  });
}

window.onfocus = () => {
  // Reconnect on return
  Meteor.reconnect();
};

// Lookup user's location
geoLookup = new ReactiveVar();
Meteor.call("geoLookup", (er, res) => {
  if(res) geoLookup.set(res);
});
