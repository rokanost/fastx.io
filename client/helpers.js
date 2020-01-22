Template.registerHelper("user", () => {
  return user.findOne();
});

Template.registerHelper("cryptos", () => {
  return cryptos.find();
});

Template.registerHelper("currencies", () => {
  return currencies.find();
});

Template.registerHelper("countries", () => {
  return countries.find();
});

Template.registerHelper("country_codes", () => {
  return COUNTRY_CODES;
});

Template.registerHelper("isActive", (v1, v2) => {
  return v1 == v2 ? "active" : ""
});

Template.registerHelper("isEqual", (v1, v2) => {
  return v1 === v2
});

Template.registerHelper("isMoreThan", (v1, v2) => {
  return v1 > v2
});

Template.registerHelper("isLessThan", (v1, v2) => {
  return v1 < v2
});

Template.registerHelper("isChecked", (v1, v2) => {
  return v1 === v2 ? "checked" : ""
});

Template.registerHelper("removeSpaces", (v) => {
  return v.replace(/ /g, '');
});

Template.registerHelper("isNotEmpty", (v) => !isEmpty(v));
Template.registerHelper("isEmpty", (v) => isEmpty(v));

Template.registerHelper("providerLink", (crypto_code, crypto_address) => {
  return PROVIDERS[crypto_code] + crypto_address
});

Template.registerHelper("statuses", (id) => STATUSES[id]);

Template.registerHelper("BASE_URL", () => {
  return BASE_URL;
});

Template.registerHelper("inversedRate", (rate, decimals) => {
  return (1 / rate).toFixed(decimals);
});

Template.registerHelper("sanitize", text => {
  return text.replace(/ /g, "-").toLowerCase()
})

// Checks if one of params is not empty
Template.registerHelper("oneOf", (...p) => {
  p.pop(); // Required to remove some spacebars stuff
  return !!_.find(p, r => !!r);
});