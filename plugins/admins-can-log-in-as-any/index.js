/* eslint-disable capitalized-comments */

const SCHEMA = {
  name: "AdminsCanLogInAsAny",
  description: "Administrators Can Log in as Any User",
  path: "/partnerbt/loginAccessPolicies.apexp",
  properties: [
    {
      name: "enabled",
      label: "Enabled",
      selector: "input[id$='adminsCanLogInAsAny']"
    }
  ]
};

class Plugin {
  constructor(browser, creds) {
    this.browser = browser;
    this.creds = creds;
  }

  static get schema() {
    return SCHEMA;
  }

  getBaseUrl() {
    return this.creds.instanceUrl + Plugin.schema.path;
  }

  async retrieve() {
    let page = await this.browser.newPage();
    await page.goto(this.getBaseUrl());
    await page.waitFor(Plugin.schema.properties[0].selector);
    let response = {};
    response[Plugin.schema.properties[0].name] = await page.$eval(
      Plugin.schema.properties[0].selector,
      el => el.checked
    );
    await page.close();
    return response;
  }

  async apply(actions) {
    if (!actions || !actions.length) {
      return;
    }
    let action = actions[0];
    let page = await this.browser.newPage();
    await page.goto(this.getBaseUrl());
    await page.waitFor(Plugin.schema.properties[0].selector);
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
      page.waitFor(".message.confirmM3"),
      page.click("input[id$=':save']")
    ]);
    await page.close();
  }
}

module.exports = Plugin;
