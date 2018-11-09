import { ShapePlugin } from '../../plugin';

export default class SalesforceToSalesforce extends ShapePlugin {
  public static schema = require('./schema.json');
  protected static SELECTORS = {
    ENABLED: '#penabled',
    BASE: 'table.detailList',
    SAVE_BUTTON: 'input[name="save"]'
  };
  protected static PATHS = {
    BASE: '/_ui/s2s/ui/PartnerNetworkEnable/e'
  };

  public async retrieve() {
    const page = this.browserforce.page;
    await page.goto(this.getBaseUrl());
    await page.waitFor(this.constructor['SELECTORS'].BASE);
    const response = {};
    const inputEnable = await page.$(this.constructor['SELECTORS'].ENABLED);
    if (inputEnable) {
      response['enableSalesforceToSalesforce'] = await page.$eval(
        this.constructor['SELECTORS'].ENABLED,
        (el: HTMLInputElement) => el.checked
      );
    } else {
      // already enabled
      response['enableSalesforceToSalesforce'] = true;
    }
    return response;
  }

  public async apply(config) {
    if (config.enableSalesforceToSalesforce === false) {
      throw new Error(
        '`enableSalesforceToSalesforce` cannot be disabled once enabled'
      );
    }
    const page = this.browserforce.page;
    await page.goto(this.getBaseUrl());
    await page.waitFor(this.constructor['SELECTORS'].ENABLED);
    await page.$eval(
      this.constructor['SELECTORS'].ENABLED,
      (e: HTMLInputElement, v) => {
        e.checked = v;
      },
      config.enableSalesforceToSalesforce
    );
    await Promise.all([
      page.waitForNavigation(),
      page.click(this.constructor['SELECTORS'].SAVE_BUTTON)
    ]);
  }
}
