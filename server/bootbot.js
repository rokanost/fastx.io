import BootBot from "bootbot";

// https://fastx.io/fb-webhook
// ssh -R fastx:80:localhost:3000 serveo.net

const bot = new BootBot({
    accessToken: FB_ACCESS_TOKEN,
    verifyToken: FB_VERIFY_TOKEN,
    appSecret: FB_APP_SECRET
});

bot.on('message', (payload, chat) => {
    Meteor.call("saveFBUser", {
        id: parseInt(payload.sender.id)
    }, (er) => {
        if(er) console.log(er)
    });
    //console.log(payload.message)
    //chat.say(`Echo: ${payload.message}`);
});



Meteor.methods({
    saveFBUser({id}) {
        check(id, PositiveIntCheck);
        // Lookup if user does not exist already
        let q = queryLiveDb(`SELECT id FROM fbusers WHERE id = ?`, [id]);

        if(!q.length) {
            // Lookup user info
            let res = HTTP.get("https://graph.facebook.com/v3.2/"+id, {
                params: {
                    fields: "first_name,last_name",
                    access_token: FB_ACCESS_TOKEN
                }
            });
            if(res.data) 
            {
                // Insert new
                queryLiveDb(
                    `INSERT INTO fbusers (id, first_name, last_name, created) VALUES(?,?,?,NOW())`, 
                    [id, res.data.first_name, res.data.last_name]
                );
            }
        }
    },
    sendFBMessageToAdmins({msg}) 
    {
        check(msg, NonEmptyStringCheck);
        let q = queryLiveDb(`SELECT f.id FROM users u 
         JOIN fbusers f ON f.user_id = u.id 
            WHERE is_admin = 1`);

        _.each(q, r => {
            try 
            {
                bot.say(r.id, msg);   
            } catch(e) {
                console.log("Error sendFBMessageToAdmins:", e)
            }
        });
    },
    sendFBMessage(p) 
    {
        check(p, {
            id: PositiveIntCheck,
            msg: NonEmptyStringCheck
        });

        return bot.say(p.id, p.msg);
    }
});



Router.route('/fb-webhook', {where: 'server'})
.get(function() {
    const req = this.request
    const res = this.response
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === FB_VERIFY_TOKEN) 
    {
        console.log('FB: Validation Succeded.')
        res.writeHead(200)
        res.end(req.query['hub.challenge']);
    } else {
        console.error('FB Failed validation.');
        res.writeHead(403);
    }
})
.post(function() {
    const data = this.request.body
	bot.handleFacebookData(data);

    // Always return success
    this.response.writeHead(200);
    this.response.end("OK");
})