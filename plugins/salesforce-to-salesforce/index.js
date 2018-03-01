/* eslint-disable capitalized-comments */
// const CONTENT_SELECTOR = "#contentWrapper";
const BASE_SELECTOR = "table.detailList";

class Plugin {
  constructor(browser, creds) {
    this.name = "Salesforce to Salesforce";
    this.browser = browser;
    this.creds = creds;
    this.baseUrl = creds.instanceUrl + "/_ui/s2s/ui/PartnerNetworkEnable/e";
    this.baseSelector = BASE_SELECTOR;
    this.property = {
      name: "enabled",
      label: "Enabled",
      selector: "#penabled"
    };
  }

  async retrieve() {
    let page = await this.browser.newPage();
    await page.goto(this.baseUrl);
    await page.waitFor(this.baseSelector);
    const inputEnable = await page.$(this.property.selector);
    let response = {};
    if (inputEnable) {
      response[this.property.name] = await page.$eval(
        this.property.selector,
        el => el.checked
      );
    } else {
      // already enabled
      response[this.property.name] = true;
    }
    await page.close();
    return response;
  }

  async apply(actions) {
    if (!actions || !actions.length) {
      return;
    }
    let action = actions[0];
    if (action.name === "enabled" && action.targetValue === false) {
      console.error(`SKIPPED: ${this.name} cannot be disabled`);
      return;
    }
    let page = await this.browser.newPage();
    await page.goto(this.baseUrl);
    await page.waitFor(this.property.selector);
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
      page.click("input[title='Save']")
    ]);
    await page.close();
  }
}

Plugin.schema = {
  properties: [{ name: "enabled", label: "Enabled", selector: "#penabled" }]
};

module.exports = Plugin;
