// INIT CCXT
import ccxt from "ccxt";

EXCHANGES_LIST = {
  // AU
  "btcmarkets": {
    'apiKey': Meteor.settings.private.BTC_MARKETS_API_KEY,
    'secret': Meteor.settings.private.BTC_MARKETS_SECRET,
    //'verbose': true
  },
  "binance": {
    'apiKey': Meteor.settings.private.BINANCE_API_KEY,
    'secret': Meteor.settings.private.BINANCE_SECRET,
  },
  /*
  "acx": {
    'apiKey': Meteor.settings.private.ACX_API_KEY,
    'secret': Meteor.settings.private.ACX_SECRET
  },
  "independentreserve": {
    'apiKey' : Meteor.settings.private.IR_API_KEY,
    'secret' : Meteor.settings.private.IR_SECRET
  },*/
  // NZ
  //"wex": {},
  //"cryptopia": {},
  // US
  //"gdax": {},
  //"poloniex": {},
  /*"bitfinex2": {
    'apiKey': Meteor.settings.private.BITFINEX_API_KEY,
    'secret': Meteor.settings.private.BITFINEX_SECRET
  },
  //"bittrex": {},
  "kraken": {
    'apiKey': Meteor.settings.private.KRAKEN_API_KEY,
    'secret': Meteor.settings.private.KRAKEN_SECRET
  },*/
  // UK
  //"bitstamp": {},
  // Others
  //"hitbtc2": {}
}


exchanges = _.reduce(EXCHANGES_LIST, (list, params, name) => {
  list[name] = new ccxt[name](params)
  return list;
}, {});
