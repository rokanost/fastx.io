/*
  condition(row,newRow,rowDeleted) {
    row	Table row data,
    newRow	New row data (only available on UPDATE queries, null for others),
    rowDeleted	Extra argument for aid in external caching: true on DELETE queries, false on INSERT queries, null on UPDATE queries
  }
*/

Meteor.publish("cryptos", function() {
  return LiveDb.select(
    `SELECT crypto_code, crypto_name, description, decimals
      FROM cryptos WHERE is_disabled = 0`, [],
    LiveMysqlKeySelector.Columns(["crypto_code"]),
      [
        {
          table: 'cryptos',
          condition: () => {
            return true
          }
        }
      ]
  );
});

Meteor.publish("upvotes", function(p) {
  _check(p,{
    id : PositiveIntCheck
  });

  return LiveDb.select(
    `SELECT id, upvotes FROM blog WHERE id = ?`, [p.id],
    LiveMysqlKeySelector.Columns(["id"]),
      [
        {
          table: 'blog',
          condition: () => {
            return true
          }
        }
      ]
  );
});


Meteor.publish("currencies", function() {
  return LiveDb.select(
    `SELECT currency_code, currency_name FROM currencies WHERE is_disabled = 0`, [],
    LiveMysqlKeySelector.Columns(["currency_code"]),
      [
        {
          table: 'countries',
          condition: (row,newRow,deletedRow) => {
            return true
          }
        }
      ]
  );
});


Meteor.publish("countries", function() {
  return LiveDb.select(
    `SELECT country_code, country_name, currency_code FROM countries WHERE is_disabled = 0`, [],
    LiveMysqlKeySelector.Columns(["country_code"]),
      [
        {
          table: 'countries',
          condition: (row,newRow,deletedRow) => {
            return true
          }
        }
      ]
  );
});


Meteor.publish("settings", function() {
  return LiveDb.select(`SELECT name, value FROM settings WHERE is_private = 0`,[],
    LiveMysqlKeySelector.Columns(["name"]),
      [
        {
          table: 'settings',
          condition: (row,newRow,deletedRow) => {
            return true
          }
        }
      ]
  );
});

Meteor.publish("conversion_rates", function() {
  return LiveDb.select(
    `SELECT
    code_from, code_to, rate, datetime
  FROM conversion_rates 
    LEFT JOIN currencies c ON c.currency_code = code_from
    LEFT JOIN currencies c2 ON c2.currency_code = code_to
    LEFT JOIN cryptos cr ON cr.crypto_code = code_from
    LEFT JOIN cryptos cr2 ON cr2.crypto_code = code_to
    WHERE IFNULL(c.is_disabled,0) != 1 AND IFNULL(c2.is_disabled,0) != 1 AND
      IFNULL(cr.is_disabled,0) != 1 AND IFNULL(cr2.is_disabled,0) != 1`, [],
    LiveMysqlKeySelector.Columns(["code_from", "code_to"]),
      [
        {
          table: 'conversion_rates',
          condition: () => {
            return true
          }
        }
      ]
  );
});


Meteor.publish("api_docs", function() {
  return LiveDb.select(
    `SELECT * FROM api_docs`, [],
    LiveMysqlKeySelector.Columns(["id"]),
    [{
      table: 'api_docs'
    }]
  );
});


Meteor.publish("nodeStatuses", function() {
  return nodeStatuses.find();
});


Meteor.publish("blog", function(id) {

  let values = [];
  if(id) {
    check(id, PositiveIntCheck);
    values.push(id);
  }

  return LiveDb.select(
    `SELECT b.*, lo.slug FROM blog b JOIN large_objects lo ON lo.id = hero_img_id 
      WHERE b.is_approved = 1` + (id ? " AND b.id = ?" : ""), values,
    LiveMysqlKeySelector.Columns(["id"]),
    [{
      table: 'blog'
    }]
  );
});
