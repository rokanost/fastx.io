Router.route('/', {
  subscriptions: function() {
    const user = Session.get("user_uuid");
    this.subscribe("bank_info", {user});
    this.subscribe("wallet_info", {user});
  },
  waitOn: function() {
    return [
      Meteor.subscribe("conversions", {user: Session.get("user_uuid")}),
      Meteor.subscribe("conversion_rates")
    ]
  },
  action: function() {
    import "./imports/ui/pages/index.js";
    this.render('index', {
      data: {}
    });
  }
});


Router.route('/:countryCode/buy/:codeTo', {
  subscriptions: function() {
    this.subscribe("bank_info", {user: Session.get("user_uuid")});
  },
  waitOn: function() {
    return [
      Meteor.subscribe("conversions", {user: Session.get("user_uuid")}),
      Meteor.subscribe("conversion_rates")
    ]
  },
  onBeforeAction: function() {
    this.codeTo = this.params.codeTo.toUpperCase();
    this.countryCode = this.params.countryCode.toUpperCase();

    if(isValidCryptoCode(this.codeTo))
    {
      let c = cryptos.findOne({crypto_code: this.codeTo});
      if(c)
      {
        let co = countries.findOne({country_code: this.countryCode});
        if(co)
        {
          const title = "Buy "+c.crypto_name+" with a credit card in "+co.country_name;
          const description = co.country_name+`&#039;s fastest crypto currency exchange. Quick and easy verification - purchase `+this.codeTo+` today. No fees.`;

          SEO.set({
            title,
            meta: {
              description,
            },
            og: {
              title,
              description,
              image: "https://fastx.io/images/fastx_logo.jpg"
            }
          });
          this.next();
          return;
        }
      }
    }

    // Code not found
    Router.go("/");
  },
  action: function() {
    import "./imports/ui/pages/index.js";

    this.render('indexLanding', {
      data: {
        action: "buy",
        codeTo: this.codeTo
      }
    });
  }
});

Router.route('/:countryCode/sell/:codeFrom', {
  subscriptions: function() {
    this.subscribe("bank_info", {user: Session.get("user_uuid")});
  },
  waitOn: function() {
    return [
      Meteor.subscribe("conversions", {user: Session.get("user_uuid")}),
      Meteor.subscribe("conversion_rates")
    ]
  },
  onBeforeAction: function() {
    this.codeFrom = this.params.codeFrom.toUpperCase();
    this.countryCode = this.params.countryCode.toUpperCase();

    if(isValidCryptoCode(this.codeFrom))
    {
      let c = cryptos.findOne({crypto_code: this.codeFrom});
      if(c)
      {
        let co = countries.findOne({country_code: this.countryCode});
        if(co)
        {
          let cur = currencies.findOne({currency_code: co.currency_code});
          const title = "Sell "+c.crypto_name+" for "+cur.currency_code+" - FastX";
          const description = co.country_name+`&#039;s fastest crypto currency exchange. Quick and easy verification. Convert `+this.codeFrom+` to `+co.currency_code+` in seconds. No fees.`;

          SEO.set({
            title,
            meta: {
              description,
            },
            og: {
              title,
              description,
              image: "https://fastx.io/images/fastx_logo.jpg"
            }
          });
          this.next();
          return;
        }
      }
    }

    // Code not found
    Router.go("/");
  },
  action: function() {
    import "./imports/ui/pages/index.js";

    this.render('indexLanding', {
      data: {
        action: "sell",
        codeFrom: this.codeFrom
      }
    });
  }
});

Router.route('/trade/:codeFrom/:codeTo', {
  subscriptions: function() {
    this.subscribe("bank_info", {user: Session.get("user_uuid")});
  },
  waitOn: function() {
    return [
      Meteor.subscribe("conversions", {user: Session.get("user_uuid")}),
      Meteor.subscribe("conversion_rates")
    ]
  },
  onBeforeAction: function() {
    this.codeFrom = this.params.codeFrom.toUpperCase();
    this.codeTo = this.params.codeTo.toUpperCase();
    if(this.codeFrom != this.codeTo && isValidCryptoCode(this.codeFrom) && isValidCryptoCode(this.codeTo))
    {
      const title = "The fastest crypto currency exchange. Trade "+this.codeFrom+" to "+this.codeTo+" with FastX";
      const description = "No registration required. Buy and Sell multiple crypto currencies. No fees.";

      SEO.set({
        title,
        meta: {
          description,
        },
        og: {
          title,
          description,
          image: "https://fastx.io/images/fastx_logo.jpg"
        }
      });
      this.next();
      return;
    }
    // Validation failed
    Router.go("/");
  },
  action: function() {
    import "./imports/ui/pages/index.js";

    this.render('indexLanding', {
      data: {
        action: "trade",
        codeFrom: this.codeFrom,
        codeTo: this.codeTo
      }
    });
  }
});

//Note: uuid is conversion uuid not user uuid
Router.route('/conversion/:uuid/:iframe?', {
  layoutTemplate: function() {
    return this._eventThisArg.params.iframe ? 'blankLayout' : 'conversionLayout'
  },
  waitOn: function() {
    return [
      Meteor.subscribe("conversions", {conversion: this.params.uuid}),
      Meteor.subscribe("conversion_rates")
    ]
  },
  data: function() {
    return conversions.findOne({uuid: this.params.uuid})
  },
  action: function() {
    if(!this.params.iframe) {
      import "./imports/ui/styles/steps.less";
    }
    import "./imports/ui/pages/pwd_reset.js";
    import "./imports/ui/styles/conversion.less";
    import "./imports/ui/components/conversion.js";
    // Fixes multiple triggers
    Tracker.nonreactive(() => {
      if(this.data()) {
        this.render('conversion');
      } else {
        this.render('conversionNotFound');
      }
    });
  }
});

Router.route('/about', {
  onBeforeAction: function(){
    SEO.set({
      title: "About",
      meta: {
        'description': 'FastX is the fastest way to convert cryptocurrency into cash.',
      },
      og: {
        'title': "About",
        'description': `FastX is Australia's best value cryptocurrency marketplace. Buy, Sell & Trade - Bitcoin, Ethereum, Litecoin, Nano, Ripple. No fees, Instant payments. Live market rates.`,
        'image': "https://fastx.io/images/fastx_logo.jpg"
      }
    });
    this.next();
  },
  action: function() {
    import "./imports/ui/pages/about.js";
    this.render('about');
  }
});

Router.route('/support', {
  onBeforeAction: function(){
    SEO.set({
      title: "Customer Support",
      meta: {
        'description': 'Get FastX support by emailing support@fastx.io. All our support staff are based in Australia.',
      },
      og: {
        'title': "Customer Support",
        'description': 'Get FastX support by emailing support@fastx.io. All our support staff are based in Australia.',
        'image': "https://fastx.io/images/fastx_logo.jpg"
      }
    });
    this.next();
  },

  action: function() {
    import "./imports/ui/pages/support.js";
    this.render('support');
  }
});

Router.route('/status', {
  waitOn: function() {
    return [Meteor.subscribe("nodeStatuses")];
  },

  onBeforeAction: function(){
    SEO.set({
      title: "Crypto Node Uptime",
      meta: {
        'description': 'Check the uptime of our BTC, BCH, ETH, LTC, XRP, NANO nodes.',
      },
      og: {
        'title': "Status",
        'description': 'Check the uptime of our BTC, BCH, ETH, LTC, XRP, NANO nodes.',
        'image': "https://fastx.io/images/fastx_logo.jpg"
      }
    });
    this.next();
  },
  action: function() {
    import "./imports/ui/pages/service_status.js";
    this.render('service_status');
  }
});

Router.route('/rates', {
  onBeforeAction: function(){
    SEO.set({
      title: "Rates",
      meta: {
        'description': 'Get the latest prices for Bitcoin, Ethereum, Litecoin, Ripple and more.',
      },
      og: {
        'title': "Rates",
        'description': 'Get the latest prices for Bitcoin, Ethereum, Litecoin, Ripple and more.',
        'image': "https://fastx.io/images/fastx_logo.jpg"
      }
    });
    this.next();
  },
  action: function() {
    import "./imports/ui/pages/rates.js";
    this.render('rates');
  }
});

Router.route('/faq', {
  onBeforeAction: function(){
    SEO.set({
      title: "Frequently Asked Questions",
      meta: {
        'description': 'Do you have questions about Bitcoin or other cryptocurrencies?',
      },
      og: {
        'title': "FAQ",
        'description': 'Do you have questions about Bitcoin or other cryptocurrencies?',
        'image': "https://fastx.io/images/fastx_logo.jpg"
      }
    });
    this.next();
  },
  action: function() {
    import "./imports/ui/pages/faq.html";
    this.render('faq');
  }
});
Router.route('/api', {
  onBeforeAction: function(){
    SEO.set({
      title: "API",
      meta: {
        'description': 'Buy, Sell & Trade - BTC, ETH, LTC, NANO, XRP programatically using our API.',
      },
      og: {
        'title': "API",
        'description': 'Buy, Sell & Trade - BTC, ETH, LTC, NANO, XRP programatically using our API.',
        'image': "https://fastx.io/images/fastx_logo.jpg"
      }
    });
    this.next();
  },
  layoutTemplate: 'blankLayout',
  subscriptions: function() {
    this.subscribe("api_docs");
  },
  action: function() {
    import "./imports/ui/pages/api.js";
    this.render('api');
  }
});
Router.route('/disclosure', {
  action: function() {
    import "./imports/ui/pages/disclosure.html";
    import "./imports/ui/styles/disclosure.less";
    this.render('disclosure');
  }
});

//Called when a user sets their password for the first time
Router.route('/verify/:email_token', {
  action: function() {
    let verification_token = this.params.email_token;
    Meteor.call("setEmailedVerified", verification_token, (err,res) => {
      if(err) return sAlert.error(err.reason);
      if(res)
      {
        //Ensure the user is logged in
        Session.set("user_uuid", res.u_uuid);
        Session.set("token", res.token);

        sAlert.success("Email verification completed, we have logged you in automatically.", {onRouteClose: false});
        // If conversion exist, go straight to it
        if(res.c_uuid) {
          Router.go('/conversion/'+res.c_uuid); //Returns the users first conversion
        } else {
          // Otherwise go to index
          Router.go('/');
        }
      }
    });
  }
});

//Called when a user resets their password
Router.route('/pwd_reset/:verification_token', {
  action: function() {
    import "./imports/ui/pages/pwd_reset.js";
    this.render('pwd_reset', {
      data: {
        verification_token: this.params.verification_token,
        heading: "Reset your old password.",
        text: "Please choose a new password."
      }
    });
  }
});

/************ ADMIN PAGES *********/
Router.route('/admin', {
  waitOn: function() {
    return [
      Meteor.subscribe("conversions", {showAll: true}),
      Meteor.subscribe("users"),
      Meteor.subscribe("exchange_balances"),
      Meteor.subscribe("bank_balances")
    ]
  },
  action: function() {
    let u = user.findOne();
    if(u)
    {
        if(u.is_admin)
        {
          import "./imports/ui/pages/admin/manual_verify.js";
          import "./imports/ui/pages/admin/admin.js";
          this.render('admin');
        } else {
          Router.go("/");
        }
    } else {
      Router.go('/login');
    }
  }
});
/*********************/


Router.route('/login', {
  onBeforeAction: function(){
    SEO.set({
      title: "Login",
      meta: {
        'description': 'Login to FastX to Buy, Sell & Trade - BTC, ETH, LTC, NANO, XRP.',
      },
      og: {
        'title': "Login",
        'description': 'Login to FastX to Buy, Sell & Trade - BTC, ETH, LTC, NANO, XRP.',
        'image': "https://fastx.io/images/fastx_logo.jpg"
      }
    });
    this.next();
  },
  action: function() {
    let u = user.findOne();
    if(u) {
      Router.go(u.is_admin ? '/admin' : '/');
    } else {
      import "./imports/ui/components/login.js";
      import "./imports/ui/pages/login.html";
      this.render('login');
    }
  }
});

Router.route('/register', {
  onBeforeAction: function(){
    SEO.set({
      title: "Register",
      meta: {
        'description': 'Register now to instantly Buy, Sell & Trade - BTC, ETH, LTC, NANO, XRP.',
      },
      og: {
        'title': "Login",
        'description': 'Register now to instantly Buy, Sell & Trade - BTC, ETH, LTC, NANO, XRP.',
        'image': "https://fastx.io/images/fastx_logo.jpg"
      }
    });
    this.next();
  },
  action: function() {
    if(user.findOne()) {
      Router.go('/');
    } else {
      import "./imports/ui/components/register.js";
      import "./imports/ui/pages/register.html";
      this.render('register');
    }
  }
});

Router.route("/blog/upload", {
  action: function() {
    import "./imports/ui/pages/blog/blog.js";
    this.render("blog_upload")
  }
});

Router.route("/blog", {
  waitOn: function() {
    return [
      Meteor.subscribe("blog")
    ]
  },
  onBeforeAction: function() {
    SEO.set({
      title: 'FastX | Latest crypto news, articles and blogs',
      meta: {
        'description': 'FastX, your source for the latest cryptocurrency news and information.',
      },
      og: {
        'title': 'FastX | Latest crypto news, articles and blogs',
        'description': 'FastX, your source for the latest cryptocurrency news and information.',
        'image': "https://fastx.io/images/fastx_logo.jpg"
      }
    });
    this.next();
  },
  action: function() {
    import "./imports/ui/pages/blog/blog.js";
    this.render("blog")
  }
})


Router.route('/blog/:title/:id', {
  waitOn: function() {
    this.blog_id = parseInt(this.params.id);
    return [
      Meteor.subscribe("upvotes", {id: this.blog_id}),
      Meteor.subscribe("blog", this.blog_id)
    ]
  },
  data: function() {
    return blog.findOne()
  },
  onBeforeAction: function(){
    // If not found, go to main blog page
    const b = this.data();
    if(!b) return Router.go("/blog"); 
    
    SEO.set({
      title: b.title,
      meta: {
        'description': b.title_description,
      },
      og: {
        'title':  b.title,
        'description': b.title_description,
        'image': "https://fastx.io/img/"+b.slug
      }
    });
    this.next();
  },
  action: function() {
    import "./imports/ui/pages/blog/blog_post.js";
    this.render('blog_post');
  }
});


Router.route('/payid/:token', {
  layoutTemplate: 'blankLayout',
  waitOn: function() {
    return [
      Meteor.subscribe("payid_orders", this.params.token),
    ]
  },
  data: function() {
    return payid_orders.findOne()
  },
  action: function() {
    if(this.data()) {
      import "./imports/ui/components/payid.js";
      this.render('payid');
    }
  }
});