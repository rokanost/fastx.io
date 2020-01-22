isProductionDomain = Meteor.absoluteUrl().indexOf("localhost") === -1;
//Configure Prerender.io
console.log("Launching prerender");
let prerender  = require('prerender-node')
prerender.set('prerenderToken', PRERENDER_TOKEN);
prerender.set('protocol', 'https');
prerender.set('host', 'www.fastx.io');
prerender.crawlerUserAgents.push('googlebot');
prerender.crawlerUserAgents.push('bingbot');
prerender.crawlerUserAgents.push('yandex');
WebApp.rawConnectHandlers.use(prerender);

Meteor.startup(() => {
  // PASS SETTINGS INTO VARIABLES
  import "./imports/startup/globals_server.js";
  // INIT DATABASE CONNECTION - MYSQL
  import "./imports/startup/db.js";
  // SETUP THE CRONS
  import "./imports/startup/crons.js";
  // INIT EXCHANGES - CCXT
  import "./imports/startup/exchanges.js";
  // INIT BRAINTREE
  import "./imports/startup/braintree.js";

  // MONGO DB
  import "./imports/listeners/active_conversions.js";
  import "./imports/listeners/active_settings.js";

  if(isProductionDomain) {
    // LISTENERS
    import "./imports/listeners/tx/btc.js";
    import "./imports/listeners/tx/ltc.js";
    import "./imports/listeners/tx/xrp.js";
    //import "./imports/providers/iota.js";
  }

  // CRONS
  import "./imports/crons/currency_rates.js";
  import "./imports/crons/conversions.js";
  import "./imports/crons/exchanges/rates.js";
  import "./imports/crons/exchanges/balance.js";
  import "./imports/crons/payid.js";
  import "./imports/crons/sms.js";

  import "./imports/crons/nodes.js";

  // SET SMTP SETTINGS
  process.env.MAIL_URL="smtp://"+SMTP_USERNAME+":"+SMTP_PASSWORD+"@"+SMTP_SERVER+":"+SMTP_PORT;

  // LOAD GOOGLE RECAPTCHA
  reCAPTCHA.config({
    privatekey: Meteor.settings.private.RECAPTCHA_PRIVATE_KEY
  });

});
