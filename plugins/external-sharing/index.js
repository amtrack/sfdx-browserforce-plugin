/* eslint-disable capitalized-comments */
// const CONTENT_SELECTOR = "#contentWrapper";
const BASE_SELECTOR = "#externalSharingModelButton";
const ENABLE_SELECTOR = "input#externalSharingModelButton:not([onclick*='Modal.confirm'])";
const DISABLE_SELECTOR = "input#externalSharingModelButton[onclick*='Modal.confirm']";

class ExternalSharing {
  constructor(browser, creds) {
    this.name = "External Sharing";
    this.browser = browser;
    this.creds = creds;
    this.baseUrl = creds.instanceUrl + "/p/own/OrgSharingDetail";
    this.baseSelector = BASE_SELECTOR;
  }

  async getValue(page) {
    const self = this;
    const buttonOnclick = await page.$eval(self.baseSelector, el => el.onclick.toString());
    return {
      enabled: buttonOnclick.indexOf("Modal.confirm") >= 0
    };
  }

  async retrieve() {
    let page = await this.browser.newPage();
    page.setDefaultNavigationTimeout(90000);
    await page.goto(this.baseUrl);
    await page.waitFor(this.baseSelector);
    let value = await this.getValue(page);
    await page.close();
    return value;
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
    if (action.name === "enabled") {
      page.on("dialog", async dialog => {
        await dialog.accept();
      });
      if (action.targetValue) {
        await Promise.all([
          page.waitFor(DISABLE_SELECTOR),
          page.click(ENABLE_SELECTOR)
        ]);
      } else {
        await Promise.all([
          page.waitFor(ENABLE_SELECTOR),
          page.click(DISABLE_SELECTOR)
        ]);
      }
    } else {
      console.error(`invalid action ${JSON.stringify(action)}`);
    }
    await page.close();
  }
}

ExternalSharing.schema = {
  properties: [{ name: "enabled", label: "Enabled", selector: BASE_SELECTOR }]
};

module.exports = ExternalSharing;
