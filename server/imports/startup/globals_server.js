COUNTRIES   = ["AU","US", "EU"];

//Security related
MFA_USER_TOKEN_LENGTH = 6;
MFA_SECRET_LENGTH = 52;
API_KEY_LENGTH = 100;

//Logging settings
MAX_CRON_HISTORY_ROWS = 1000; //Maximum number of rows allowed in the cron_history table

FROM_ADDR     = "support@fastx.io";

RIPPLE_ADDRESS = "r9SjM6hAugn7xjvVYB23heT9VK95bxpdX1";

/// CONVERSIONS
MAXIMUM_PENDING_CONVERSIONS_LIMIT = 5;
MININUM_BTC_CONFIRMATIONS = 1;

// CHART DATA
CHART_PRICE_HISTORY_DATA_DISPLAY_DAYS = 31;

NANO_REPRESENTATIVE = "xrb_3pczxuorp48td8645bs3m6c3xotxd3idskrenmi65rbrga5zmkemzhwkaznh";

VERIFICATION_TOKEN_LENGTH = 100;
SESSION_TOKEN_LENGTH = 100;

VERIFICATION_TOKEN_LIFE_MINS = 24*60; // Password reset
SESSION_TOKEN_LIFE_MINS = 2*60; // User session 2 hours

// MAKE ALL SETTINGS GLOBAL
_.each(Meteor.settings.private, (v,k) => {
    global[k] = v; // assigns variables same as above (VARIABLE=value)
});