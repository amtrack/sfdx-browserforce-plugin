/* eslint-disable capitalized-comments */
// const CONTENT_SELECTOR = "#contentWrapper";
const BASE_SELECTOR = "#penabled";

class CustomerPortal {
  constructor(browser, creds) {
    this.name = "Customer Portal";
    this.browser = browser;
    this.creds = creds;
    this.baseUrl =
      creds.instanceUrl + "/_ui/core/portal/CustomerSuccessPortalSetup/e";
    this.baseSelector = BASE_SELECTOR;
    this.property = {
      name: "enabled",
      label: "Enabled",
      selector: "#penabled"
    };
  }

  async retrieve() {
    let page = await this.browser.newPage();
    page.setDefaultNavigationTimeout(90000);
    await page.goto(this.baseUrl);
    await page.waitFor(this.baseSelector);
    const customerPortalNotAvailable = await page.$("#errorTitle");
    if (customerPortalNotAvailable) {
      console.log("SKIPPED: Customer Portal not available");
      return false;
    }
    await page.waitFor(this.baseSelector);
    let response = {};
    response[this.property.name] = await page.$eval(
      this.property.selector,
      el => el.checked
    );
    await page.close();
    return response;
  }

  async apply(actions) {
    if (!actions || !actions.length) {
      return;
    }
    let page = await this.browser.newPage();
    page.setDefaultNavigationTimeout(90000);
    await page.goto(this.baseUrl);
    await page.waitFor(this.baseSelector);
    let action = actions[0];
    if (action.name === "enabled" && action.targetValue === false) {
      console.error("SKIPPED: Customer Portal cannot be disabled");
      return;
    }
    await page.evaluate(
      data => {
        // eslint-disable-next-line no-undef
        var checkbox = document.querySelector(data.action.selector);
        checkbox.checked = data.action.targetValue;
      },
      {
        action
      }
    );
    await Promise.all([
      page.waitForNavigation(),
      page.click("input[name='save']")
    ]);
    await page.close();
  }
}

CustomerPortal.schema = {
  properties: [{ name: "enabled", label: "Enabled", selector: BASE_SELECTOR }]
};

module.exports = CustomerPortal;
