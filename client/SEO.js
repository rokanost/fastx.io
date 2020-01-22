
Meteor.startup(function() {
  if(Meteor.isClient)
  { 
    const title = 'FastX - Buy Bitcoin, Ethereum, Litecoin, Nano, Ripple and more';
    const description = `Buy multiple crypto currencies like Bitcoin, Ether, XRP, NANO and more. No fees, quick and easy verification. Instant payouts. Credit cards accepted.`;

    return SEO.config({
      title,
      meta: {
        description,
        viewport: 'width=device-width, initial-scale=1'
      },
      og: {
        title,
        description,
        image: 'https://fastx.io/images/fastx_logo.jpg'
      }
    });
  }
 });