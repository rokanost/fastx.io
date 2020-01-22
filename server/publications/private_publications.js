Meteor.publish("user", function() {
  if(!this.userId) return this.ready();
  let userId = parseInt(this.userId);

  return LiveDb.select(
    `SELECT uuid, first_name, last_name, dob, address, email, kyc_level, kyc_status, email_verified, is_admin FROM users WHERE id = ?`, [userId],
    LiveMysqlKeySelector.Columns(["uuid"]),
      [
        {
          table: 'users',
          condition: (row, newRow, rowDeleted) => {
            return (row.id === userId && ((newRow && newRow.id === userId) || rowDeleted))
          }
        }
      ]
  );
});

Meteor.publish("conversions", function(p) {
  try {
    check(p, Object);

    // Get single conversion if conversion:uuid supplied
    if(p.conversion)
    {
      check(p.conversion, uuidCheck);
      // Check if conversion exist
      let q = queryLiveDb(`SELECT id, type_id, input_info_id, status_id FROM conversions WHERE uuid = ?`, [p.conversion]);
      if(q.length === 0) return this.ready();

      // Check if expired (if so, reactivate)
      if(q[0].status_id == 0) {
        queryLiveDb(
          `UPDATE conversions
              SET 
                status_id = 1, 
                datetime = NOW() + INTERVAL 6 HOUR
            WHERE id = ?`, [q[0].id]
        );
        Meteor.defer(() => {
          // Update rates
          Meteor.call("updateConversionRates");
        });
      }
      
      

      let conversion_id = q[0].id;
      let typeId = q[0].type_id;
      let input_info_id = q[0].input_info_id;

      let query;
      switch (typeId) {
        case 1:
          query = `SELECT
              c.uuid, c.tag, c.input_code, c.input_amount, c.output_code, c.output_amount, c.is_precise, datetime, type_id, status_id, refund_address, description,
                wi.crypto_address input_address, wi.pending_balance, wi.confirmed_balance, ROUND(1 / input_amount * output_amount, 2) as rate,
                bi.bank_name, bi.bsb, bi.account_name, bi.number, bi.bpay_reference, bi.bpay_biller_code, bi.payid, bi.payid_type, output_sent_datetime, kyc_level
            FROM conversions c
              JOIN wallet_info wi ON wi.id = input_info_id
              JOIN bank_info bi ON bi.id = output_info_id
              JOIN users u ON u.id = user_id
            WHERE c.id = ?`
        break;
        case 2:
          query = `SELECT
              c.uuid, c.tag, c.input_code, c.input_amount, c.output_code, c.is_precise, c.output_amount, datetime, type_id, status_id, refund_address,
              wi.crypto_address input_address, wi.pending_balance, wi.confirmed_balance, ROUND(1 / input_amount * output_amount, 8) as rate,
              wi2.crypto_address output_address, output_sent_datetime, kyc_level
            FROM conversions c
              JOIN wallet_info wi ON wi.id = input_info_id
              JOIN wallet_info wi2 ON wi2.id = output_info_id
              JOIN users u ON u.id = user_id
            WHERE c.id = ?`
        break;
        case 3:
          query = `SELECT
              c.uuid, c.tag, c.input_code, c.input_amount, c.output_code, c.output_amount, c.is_precise, datetime, type_id, status_id, refund_address, description,
              wi.crypto_address output_address, ROUND(input_amount / output_amount, 2) as rate, output_sent_datetime, kyc_level
            FROM conversions c
              JOIN wallet_info wi ON wi.id = output_info_id
              JOIN users u ON u.id = user_id
            WHERE c.id = ?`
        break;
        case 4:
          query = `SELECT
              c.uuid, c.tag, c.input_code, c.input_amount, c.output_code, c.is_precise, c.output_amount, datetime, type_id, status_id, output_sent_datetime, kyc_level
            FROM conversions c
              JOIN bank_info bi ON bi.id = input_info_id
              JOIN bank_info bi2 ON bi2.id = output_info_id
              JOIN users u ON u.id = user_id
            WHERE c.id = ?`
        break;
      }

      return LiveDb.select(query, [conversion_id],
        LiveMysqlKeySelector.Columns(["uuid"]),
          [
            {
              table: 'conversions',
              condition: (row, newRow, onDelete) => {
                return row.id === conversion_id || (newRow && newRow.id === conversion_id)
              }
            },
            {
              table: 'wallet_info',
              condition: (row, newRow, onDelete) => {
                return row.id === input_info_id || (newRow && newRow.id === input_info_id)
              }
            }
          ]
      );
    }
      // Otherwise, get all user conversions
      else if(p.user || this.userId)
    {
        let user_id;
        // If not logged in, user:uuid must be supplied
        if(!this.userId) {
          check(p.user, uuidCheck);
          // Check if user exists
          let user = getUser(p.user);
          if(!user) {
            // If it doesn't, return last orders 
            return lastConversionsPublication();
          }

          user_id = user.id;
        } else {
          user_id = parseInt(this.userId);
        }

        // If user is logged in and its an admin and showAll:true, 
        // display all conversions (needed for admin page)
        if(p.showAll) {

          // Fail silently
          if(!isAdmin(this.userId)) return this.ready();
          
            return LiveDb.select(`SELECT
                uuid, c.id, user_id, input_code, input_amount, input_info_id, 
                output_code, output_amount, output_info_id, refund_address, 
                datetime, type_id, output_sent_datetime, status_id, exchange_name, 
                sell_order_price, input_amount_sent_to_exchange, output_aud_rate_at_the_time
              FROM conversions c`, [],
              LiveMysqlKeySelector.Columns(["uuid"]),
                [
                  {
                    table: 'conversions',
                    condition: (row, newRow, onDelete) => {
                      return true
                    }
                  }
                ]
            );
        }

        // Otherwise, return conversions for that user
        return LiveDb.select(`SELECT
            uuid, input_code, input_amount, output_code, output_amount, refund_address, datetime, status_id
          FROM conversions c
            WHERE user_id = ?`, [user_id],
          LiveMysqlKeySelector.Columns(["uuid"]),
            [
              {
                table: 'conversions',
                condition: (row, newRow, onDelete) => {
                  return row.user_id === user_id || (newRow && newRow.user_id === user_id)
                }
              }
            ]
        );
    }

  } catch(e) {
    console.log("conversions sub:", e);
  }
});

// User bank/BPAY accounts
Meteor.publish("bank_info", function(p) {

  let user_id;
  // Check if userUUID is not supplied
  if(!(p && p.user)) 
  {
    if(!this.userId) return this.ready();
    user_id = parseInt(this.userId);
  } 
    else 
  {
    // Otherwise, get the user id
    check(p.user, uuidCheck);
    let user = getUser(p.user);
    if(!user) return this.ready();
    user_id = user.id
  }

  return LiveDb.select(
    `SELECT bi.* FROM bank_info bi
      JOIN conversions c ON c.output_info_id = bi.id
    WHERE
      type_id IN(1,4) AND
      user_id = ?`, [user_id],
    LiveMysqlKeySelector.Columns(["id"]),
      [
        {
          table: 'conversions',
          condition: (row, newRow) => {
            return row.user_id === user_id || (newRow && newRow.user_id === user_id)
          }
        }
      ]
  );
});


Meteor.publish("wallet_info", function(p) {

  let user_id;
  // Check if userUUID is not supplied
  if(!(p && p.user)) 
  {
    if(!this.userId) return this.ready();
    user_id = parseInt(this.userId);
  } 
    else 
  {
    // Otherwise, get the user id
    check(p.user, uuidCheck);
    let user = getUser(p.user);
    if(!user) return this.ready();
    user_id = user.id
  }

  return LiveDb.select(
    `SELECT wi.* FROM wallet_info wi
      JOIN conversions c ON c.output_info_id = wi.id
    WHERE
      type_id IN(2,3) AND
      user_id = ?`, [user_id],
    LiveMysqlKeySelector.Columns(["id"]),
      [
        {
          table: 'conversions',
          condition: (row, newRow) => {
            return row.user_id === user_id || (newRow && newRow.user_id === user_id)
          }
        }
      ]
  );
});


//Returns the user and verification documents
//Must pass p.uuid and p.verification_token
Meteor.publish("users", function() {
  if(!isAdmin(this.userId)) return this.ready();

  return LiveDb.select(
    `SELECT 
      u.id, u.uuid, u.first_name, u.last_name, u.dob, u.address, 
      u.email, u.kyc_level, u.kyc_status, timestamp, is_admin
    FROM users u`, [],
    LiveMysqlKeySelector.Columns(["id"]),
      [
        {
          table: 'users',
          condition: (row, newRow, rowDeleted) => {
            return true;
          }
        }
      ]
  );
});

Meteor.publish("kyc_documents", function() {
  if(!isAdmin(this.userId)) return this.ready();
  /// Show only unverified documents
  return LiveDb.select(
    `SELECT * FROM kyc_documents WHERE verified IS NULL`, [],
    LiveMysqlKeySelector.Columns(["id"]),
      [
        {
          table: 'kyc_documents',
          condition: (row,newRow,rowDeleted) => {
            return true;
          }
        }
      ]
  );
});

Meteor.publish("banks", function() {

  if(!isAdmin(this.userId)) return this.ready();

  return LiveDb.select(
    `SELECT * FROM bank_info`, [],
    LiveMysqlKeySelector.Columns(["id"]),
      [
        {
          table: 'bank_info',
          condition: (row,newRow,rowDeleted) => {
            return true;
          }
        }
      ]
  );
});

Meteor.publish("wallets", function() {

  if(!isAdmin(this.userId)) return this.ready();

  return LiveDb.select(
    `SELECT * FROM wallet_info`, [],
    LiveMysqlKeySelector.Columns(["id"]),
      [
        {
          table: 'wallet_info',
          condition: (row,newRow,rowDeleted) => {
            return true;
          }
        }
      ]
  );
});

function lastConversionsPublication(limitRows) {
      // Return last conversions for public access 
      return LiveDb.select(`SELECT
          input_code, input_amount, output_code, output_amount, datetime, status_id
        FROM conversions c ORDER BY datetime DESC LIMIT ?`, [limitRows || 22],
        LiveMysqlKeySelector.Columns(["datetime"]),
          [
            {
              table: 'conversions',
              condition: (row, newRow, onDelete) => {
                // Trigger on INSERT & DELETE
                return onDelete !== null
              }
            }
          ]
      );
}