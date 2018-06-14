const puppeteer = require("puppeteer");

class Browserforce {
  async launch(o) {
    let opts = o || {
      headless: true
    };
    let browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: Boolean(opts.headless)
    });
    return browser;
  }

  async login(org) {
    this.org = org;
    let page = await this.browser.newPage();
    page.setDefaultNavigationTimeout(90000);
    await page.setViewport({ width: 1024, height: 768 });
    await page.goto(
      `${this.org.authConfig.instanceUrl}/secur/frontdoor.jsp?sid=${
        this.org.authConfig.accessToken
      }&retURL=setup/forcecomHomepage.apexp`
    );
    await page.waitForNavigation();
    this.page = page;
    return this;
  }

  async logout() {
    await this.browser.close();
    return this;
  }
}

Browserforce.plugins = {
  ExternalSharing: require("../plugins/external-sharing")
};

module.exports = Browserforce;
