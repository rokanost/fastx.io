import "./crons_mysql.js";

SyncedCron.config({log: false});

if (isProductionDomain || Meteor.settings.public.run_crons) {
  console.log("*** Starting Crons");
  SyncedCron.start();
} else {
  console.log("**** Crons are not running");
}

//Clear the cron_history periodically.
SyncedCron.add({
  name: 'clearCronHistory',
  schedule: function(parser) {
	   return parser.text('every 1 minute');
  },
  job: function() {
    queryLiveDb(
      `DELETE t FROM cron_history t 
        CROSS JOIN (SELECT count(id) as cnt FROM cron_history t) c 
      WHERE c.cnt > ?`, 
      [MAX_CRON_HISTORY_ROWS]
    );
    return true;
  }
});

//Clear tokens
SyncedCron.add({
  name: 'clearTokens',
  schedule: function(parser) {
	   return parser.text('every 1 minute');
  },
  job: function() {
    // Password reset
    queryLiveDb(
      `UPDATE users 
        SET 
          verification_token = NULL, 
          verification_token_created_timestamp = NULL 
      WHERE 
        TIMESTAMPDIFF(MINUTE, verification_token_created_timestamp,NOW()) > ?`, 
      [VERIFICATION_TOKEN_LIFE_MINS]
    );
    // Wait for a second..
    Promise.await(delay(1000));
    // User session
    queryLiveDb(
      `UPDATE users 
        SET 
          session_token = NULL, 
          session_ip = NULL,
          session_token_created_timestamp = NULL 
      WHERE 
        TIMESTAMPDIFF(MINUTE, session_token_created_timestamp,NOW()) > ?`, 
      [SESSION_TOKEN_LIFE_MINS]
    );
    return true;
  }
});


