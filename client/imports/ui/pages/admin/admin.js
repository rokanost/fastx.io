import "./admin.html";

wallets = new Mongo.Collection("wallets");
banks = new Mongo.Collection("banks");
exchange_balances = new Mongo.Collection("exchange_balances");
bank_balances = new Mongo.Collection("bank_balances");

Template.admin.onCreated(function() {
  this.subscribe("wallets");
  this.subscribe("banks");
});

Template.admin.events({
  "click button[data-uuid].pay"(e,tpl) {
    if(confirm("Are you sure?")) 
    {
      // Start payment process
      $('button[data-uuid]').button('loading');
      Meteor.call("releaseConversionOutput", {
        conversion_uuid: $(e.currentTarget).data('uuid')
      }, (er, res) => {
        $('button[data-uuid]').button('reset');
        if(er) {
          console.log(er);
          return sAlert.error(er.reason);
        }
        console.log(res);
        sAlert.success("Conversion completed (if it's a bank payment it might take a while to process)");
      });
    }
  },
  "click button[data-uuid].paid"(e,tpl) {
    if(confirm("Are you sure?")) 
    {
      // Start payment process
      $('button[data-uuid]').button('loading');
      Meteor.call("markAsCompletedManually", {
        conversion_uuid: $(e.currentTarget).data('uuid')
      }, (er, res) => {
        $('button[data-uuid]').button('reset');
        if(er) {
          console.log(er);
          return sAlert.error(er.reason);
        }
        console.log(res);
        sAlert.success("Marked as completed");
      });
    }
  }
});


Template.admin.helpers({
  bank_balances() {
    return {
      collection: bank_balances.find(),
      showFilter: true,
      fields: [
        { key: 'bank_name', label: 'Bank' },
        { key: 'currency_code', label: 'Currency' },
        { key: 'balance', label: 'Balance'},
        { key: 'updated_timestamp', label: 'Last updated'},
        { key: 'bank_name', label: 'Actions', fn: () => {
          // Actions
          return Spacebars.SafeString(
            `<div class="dropdown">
              <button class="btn btn-primary dropdown-toggle" type="button" data-toggle="dropdown">
                <span class="glyphicon glyphicon-export"></span>
              </button>
              <ul class="dropdown-menu">
                <li class="dropdown-header">Exchanges</li>
                <li><a href="#">btcmarkets</a></li>
              </ul>
            </div>`
          )
        }}
      ]
    }
  },
  exchange_balances() {
    return {
      collection: exchange_balances.find(),
      showFilter: true,
      fields: [
        { key: 'exchange_name', label: 'Exchange' },
        { key: 'currency_code', label: 'Currency' },
        { key: 'balance', label: 'Balance', fn:(v) => {
          // Todo: display like: {BAL} (${IN_AUD})
          return v
        }},
        { key: 'updated_timestamp', label: 'Last updated'},
        { key: 'exchange_name', label: 'Actions', fn: () => {
          // Actions
          return Spacebars.SafeString(
            `<div class="dropdown">
              <button class="btn btn-primary dropdown-toggle" type="button" data-toggle="dropdown">
                <span class="glyphicon glyphicon-export"></span>
              </button>
              <ul class="dropdown-menu">
                <li class="dropdown-header">Exchanges</li>
                <li><a href="#">btcmarkets</a></li>
                <li><a href="#">binance</a></li>
              </ul>
            </div>`
          )
        }}
      ]
    }
  },
  conversions() {
    return {
      collection: conversions.find(),
      rowsPerPage: 10,
      showFilter: true,
      fields: [
        { key: 'id', label: '#' },
        { key: 'user_id', label: 'User', fn: (id) => {
          let u = users.findOne({id: id});
          return Spacebars.SafeString(
            (u.first_name || "")+ " " + (u.last_name ? u.last_name + "<br />" : "") + (u.email || "")
          )
        }},
        { key: 'datetime', label: 'Date', sortOrder: 0, sortDirection: 'descending'},
        { key: 'input_amount', label: 'In'},
        { key: 'input_code', label: 'From' },
        { key: 'output_amount', label: 'Out'},
        { key: 'output_code', label: 'To'},
        { key: 'exchange_name', label: 'Exchange'},
        { key: 'sell_order_price', label: 'Profit (AUD)', fn: (sell_order_price, obj) => {
          if(obj.status_id === 3) 
          {
            if([1,4].indexOf(obj.type_id) > -1) {
              // If c/f or f/f
              if(sell_order_price) 
                return (obj.input_amount_sent_to_exchange * sell_order_price - obj.output_amount).toFixed(2)   
            } 
              else 
            {
              // c/c
              if(obj.type_id === 2) {
                return ((obj.input_amount_sent_to_exchange * sell_order_price) - (obj.output_amount * obj.output_aud_rate_at_the_time)).toFixed(2)
              } else {
                // f/c
                return (obj.input_amount - obj.output_amount * obj.output_aud_rate_at_the_time).toFixed(2)
              }
            }
          }
        }},
        { key: 'input_info_id', label: 'Input', fn: (id, obj) => {
          return Spacebars.SafeString(inputInfoDisplay(obj) || "");
        }},
        { key: 'output_info_id', label: 'Output', fn: (id, obj) => {
          return Spacebars.SafeString(outputInfoDisplay(obj) || "")
        }},
        { key: 'status_id', label: 'Status', fn: (status_id) => {
          return STATUSES[status_id];
        }},
        { key: 'status_id', label: 'Actions', fn: (status_id, obj) => {
          if(status_id === 3) {
            if(!obj.output_sent_datetime) 
            {
              let u = users.findOne({id: obj.user_id});
              if(u.kyc_level >= TYPE_VERIFICATION_LEVEL_REQUIRED[obj.type_id]) 
              {
                // if amount is confirmed and not sent yet
                return Spacebars.SafeString(
                  `<button class="btn btn-xs btn-primary pay" data-uuid="`+obj.uuid+`">Pay</button>
                  <button class="btn btn-xs btn-primary paid" data-uuid="`+obj.uuid+`">Paid Manually</button>`
                );
              }
            } else {
              return "Completed";
            }
          }
        }}
      ]
    }
  }
});


function inputInfoDisplay(p) {
  if(_.contains([1,2], p.type_id)) {
    // crypto wallet
    let wallet = wallets.findOne({id: p.input_info_id});
    return wallet ? `<a target="_blank" href="`+(PROVIDERS[p.input_code] + wallet.crypto_address)+`">Check</a>` : ``;
  }
}


function outputInfoDisplay(p) {
  if(_.contains([2,3], p.type_id)) {
    // crypto wallet
    let wallet = wallets.findOne({id: p.output_info_id});
    return wallet ? `<a target="_blank" href="`+(PROVIDERS[p.output_code] + wallet.crypto_address)+`">Check</a>` : ``;
  } else {
    // customer's bank
    let b = banks.findOne({id: p.output_info_id});
    if(!b) return "";
    if(b.account_name) 
    {
      // Bank
      return b.bank_name+"<br />"+b.account_name+"<br />"+(b.bsb || "")+" "+b.number
    } else if(b.bpay_biller_code) {
      // BPAY
      return "BPAY CODE: "+b.bpay_biller_code+"<br />BPAY REF: "+b.bpay_reference 
    } else {
      // PayID
      return "PayID: "+b.payid+"<br />Type: "+b.payid_type 
    }
  }
}
