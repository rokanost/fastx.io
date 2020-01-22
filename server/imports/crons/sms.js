SyncedCron.add({
  name: 'nexmoSMSforANZ',
  schedule: function(parser) {
       return parser.text('every 10 seconds');
  },
  job: function() {
      if(!!SETTINGS['maintenance']) return false;

      // Run only when inside a new payment with ANZ
      if(!anz.insideNewPayment) return;

      // Check for new SMSes for today
      const date = new Date().toISOString().split("T")[0];

      let res = HTTP.get("https://rest.nexmo.com/search/messages", {
        params: {
          date,
          to: NEXMO_TO,
          api_key: NEXMO_API_KEY, 
          api_secret: NEXMO_API_SECRET
        }
      });

      let q = queryLiveDb(`SELECT * FROM sms WHERE datetime >= ?`, [date]);
      let messages = _.map(q, r => r.message_id);

      if(res.data) 
      {
        let index = 0;
        _.each(res.data.items, i => {
          const message_id = i["message-id"];
          // Only from ANZ and not yet stored in DB
          if(i.from === "ANZ" && messages.indexOf(message_id) === -1) 
          {
            // Process on index=0, because its the latest SMS
            if(index === 0) 
            {
              // Complete ANZ transfer
              const code = i.body.match(new RegExp("ANZ: " + "(.*)" + " is"))[1];
              anz.SMSverification(code);
            }

            // Insert SMS into DB
            queryLiveDb(`INSERT IGNORE INTO sms (message_id,datetime) VALUES(?,NOW())`, [message_id]);
            index += 1;
          }
        });
      }
  }
});