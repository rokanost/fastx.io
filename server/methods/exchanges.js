// TODO: better validators

  /*
    ============================================================================
      Input: (object) {type = buy/sell, pair = 'BTC/AUD', minAmount = 0.1}
      Response: [price, amount, exchange] = [12000.00, 2.4, 'acx']
    ============================================================================
  */
  getTheBestPriceTo = ({type, pair, minAmount}) => {
    check(type, NonEmptyStringCheck);
    check(pair, NonEmptyStringCheck);
    check(minAmount, Number);

    let prices = {};
    return Promise.await(
      new Promise((resolve) => {
      _.each(exchanges, (ex, name) => {
        Promise.await(ex.loadMarkets());
        if(ex.markets[pair]) {
          let res = Promise.await(ex.fetchOrderBook(pair));
          let orders = (type === 'buy' ? res.asks : res.bids);
          let filtered = _.filter(orders, r => r[1] >= minAmount);
          if(filtered.length > 0) {
            if(type === 'buy')
            {
              // RETURN THE LOWEST PRICE TO BUY
              prices[name] = _.min(filtered, r => r[0]).concat(name);
            }
            else if (type === 'sell')
            {
              // RETURN THE HIGHEST PRICE TO SELL
              prices[name] = _.max(filtered, r => r[0]).concat(name);
            }
          }
        }
      });

      if(type === 'buy') {
        resolve(_.sortBy(prices, p => p[0]));
      }
      else if (type === 'sell')
      {
        resolve(_.sortBy(prices, p => p[0]).reverse());
      }
    }));
  }

  /*
    ============================================================================
      Return: all available balances
    ============================================================================
  */
  getAllBalances = () => {
    return Promise.await(new Promise((resolve) => {
      let balances = {}
      _.each(exchanges, (ex, name) => {
        balances[name] = getExchangeBalance(name);
      });
      resolve(balances);
    }));
  }

  /*
    ============================================================================
      Input ex: (object) ('BTC/AUD', 1, 15000, 'acx')
    ============================================================================
  */
  createLimitBuyOrder = ({pair, amount, price, exchange}) => {
    check(pair, NonEmptyStringCheck);
    check(amount, Number);
    check(price, Number);
    check(exchange, NonEmptyStringCheck);

    return Promise.await(exchanges[exchange].createLimitBuyOrder(pair, amount, price));
  };


  createMarketBuyOrder = ({pair, amount, exchange}) => {
    check(pair, NonEmptyStringCheck);
    check(amount, Number);
    check(exchange, NonEmptyStringCheck);

    return Promise.await(exchanges[exchange].createMarketBuyOrder(pair, amount));
  };


  /*
    ============================================================================
      Input ex: (object) ('BTC/AUD', 1, 15000, 'acx')
    ============================================================================
  */
  createLimitSellOrder = ({pair, amount, price, exchange}) => {
    check(pair, NonEmptyStringCheck);
    check(amount, Number);
    check(price, Number);
    check(exchange, NonEmptyStringCheck);

    return Promise.await(exchanges[exchange].createLimitSellOrder(pair, amount, price));
  };

  createMarketSellOrder = ({pair, amount, exchange}) => {
    check(pair, NonEmptyStringCheck);
    check(amount, Number);
    check(exchange, NonEmptyStringCheck);

    return Promise.await(exchanges[exchange].createMarketSellOrder(pair, amount));
  };

  /*
    ============================================================================
      Input ex: (object) ('BTC/AUD', 1, 'acx')
      NOTE: not a good idea to use marketPrice
    ============================================================================
  */
  /*createMarketBuyOrder({pair, amount, exchange}) {
    check(exchange, NonEmptyStringCheck);
    return Promise.await(exchanges[exchange].createMarketBuyOrder(pair, amount));
  },*/

  /*
    ============================================================================
      Input ex: (string) 'acx'
    ============================================================================
  */
  getExchangeBalance = (exchange) => {
    check(exchange, NonEmptyStringCheck);
    return Promise.await(exchanges[exchange].fetchBalance());
  };


  /*
    ============================================================================
      Input ex: (string) 'ETH/AUD'
    ============================================================================
  */
  getExchangeOrders = ({exchange, pair}) => {
    check(exchange, NonEmptyStringCheck);
    check(pair, NonEmptyStringCheck);

    exchange = exchange.toLowerCase();
    switch (exchange) {
      case "acx":
        pair = pair.replace("/", "").toLowerCase();
        return Promise.await(exchanges["acx"].privateGetOrders({market: pair}));
      break;
    }
  };

  /*
    ============================================================================
      Input ex: (string) '123'
    ============================================================================
  */
  cancelExchangeOrder = ({exchange, id}) => {
    check(exchange, NonEmptyStringCheck);
    check(id, PositiveIntCheck);

    return Promise.await(exchanges[exchange].cancelOrder(id));
  };


  /*
    ============================================================================
      Input ex: (string) 'acx'
    ============================================================================
  */
  fetchTickers = (exchange) => {
    check(exchange, NonEmptyStringCheck);
    return Promise.await(exchanges[exchange].fetchTickers());
  };

  withdrawFromExchange = ({exchange, code, amount, tag = undefined, params = {}, address}) => {
    check(exchange, NonEmptyStringCheck);
    return Promise.await(exchanges[exchange].withdraw(code, amount, address, tag, params));
  }
