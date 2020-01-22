LiveDb.select(`SELECT
    c.id,
    uuid,
    wi.id wallet_id,
    pending_balance,
    input_code,
    wi.crypto_address,
    datetime,
    tag,
    is_precise,
    ROUND(1 / input_amount * output_amount, 2) as rate,
    input_amount,
    type_id,
    status_id
  FROM conversions c
    JOIN wallet_info wi ON wi.id = c.input_info_id
      WHERE
        type_id IN (1,2) AND
        status_id = 1`, [],
  LiveMysqlKeySelector.Columns(["id"]),
  [{
    table: "conversions",
    condition: (row, newRow) => {
      return true;
    }
  }])
  .on("update", Meteor.bindEnvironment(function(diff, data) {
    // Added
    _.each(diff.added, row => {
      activeConversions.insert(row);
    });
    // Changed
    _.each(diff.changed, (changes, id) => {
      activeConversions.update({id: parseInt(id)}, {$set: changes});
    });
    // Removed
    _.each(diff.removed, (o, id) => {
      activeConversions.remove({id: parseInt(id)});
    });
  })
);
