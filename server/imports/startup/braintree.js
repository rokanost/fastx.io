import braintree from "braintree";

// INIT BRAINTREE
let braintree_gateway = braintree.connect({
  environment:  braintree.Environment.Production,
  merchantId:   BT_MERCHANT_ID,
  publicKey:    BT_PUBLIC_KEY,
  privateKey:   BT_PRIVATE_KEY
});

BraintreeSale = Meteor.wrapAsync(braintree_gateway.transaction.sale, braintree_gateway.transaction);
BraintreeCustomerCreate = Meteor.wrapAsync(braintree_gateway.customer.create, braintree_gateway.customer);