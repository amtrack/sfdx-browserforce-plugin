const puppeteer = require("puppeteer");

module.exports = class Browserforce {
  constructor(org) {
    this.org = org;
    this.browser = undefined;
  }

  async login() {
    this.browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: !(process.env.BROWSER_DEBUG === "true")
    });
    let page = await this.browser.newPage();
    page.setDefaultNavigationTimeout(90000);
    await page.setViewport({ width: 1024, height: 768 });
    await page.goto(
      `${this.org.authConfig.instanceUrl}/secur/frontdoor.jsp?sid=${
        this.org.authConfig.accessToken
      }&retURL=setup/forcecomHomepage.apexp`
    );
    await page.waitForNavigation();
    await page.close();
    return this;
  }

  async logout() {
    await this.browser.close();
    return this;
  }
};
