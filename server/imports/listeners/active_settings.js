SETTINGS = {};
LiveDb.select(`SELECT name, value FROM settings`, [],
  LiveMysqlKeySelector.Columns(["name"]),
  [{table: 'settings'}]
).on("update", Meteor.bindEnvironment((diff, data) => {
  // onAdd
  if(Object.keys(diff.added).length > 0) {
    _.each(diff.added,
    (s) => {
      SETTINGS[s.name] = isNaN(s.value) ? s.value : parseFloat(s.value)
    });
  }
  // onChange
  if(Object.keys(diff.changed).length > 0) {
    _.each(diff.changed, (s, s_name) => {
      SETTINGS[JSON.parse(s_name)] = isNaN(s.value) ? s.value : parseFloat(s.value)
    });
  }
}));
