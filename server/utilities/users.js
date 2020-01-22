getUser = (uuid) => {
  if(!uuid)
    throw new Meteor.Error("getUser","uuid cannot be null!");

  let q = queryLiveDb(`SELECT id, uuid, kyc_level, email FROM users WHERE uuid = ?`, [uuid]);
  if(q && q.length > 0) {
    return q[0];
  }
}
