import puppeteer from "puppeteer";

puppet = {

  browser: null,

  initBrowser: function() {
    if(this.browser) return "Browser already running";

    let settings = {headless: isProductionDomain};
    if(isProductionDomain) {
      settings.executablePath = "/usr/bin/google-chrome";
    }

    this.browser = wait(puppeteer.launch(settings));
    return "OK";
  },

  closeBrowser: function() {
    if(!this.browser) return "Browser is not initialized";
    wait(this.browser.close());
    this.browser = null;
    return "OK";
  }
}