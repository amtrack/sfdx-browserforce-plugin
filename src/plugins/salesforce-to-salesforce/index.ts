import { BrowserforcePlugin } from '../../plugin';

const PATHS = {
  BASE: '_ui/s2s/ui/PartnerNetworkEnable/e'
};
const SELECTORS = {
  ENABLED: '#penabled',
  BASE: 'table.detailList',
  SAVE_BUTTON: 'input[name="save"]'
};

export default class SalesforceToSalesforce extends BrowserforcePlugin {
  public async retrieve() {
    const page = this.browserforce.page;
    await page.goto(`${this.browserforce.getInstanceUrl()}/${PATHS.BASE}`);
    await page.waitFor(SELECTORS.BASE);
    const response = {};
    const inputEnable = await page.$(SELECTORS.ENABLED);
    if (inputEnable) {
      response['enableSalesforceToSalesforce'] = await page.$eval(
        SELECTORS.ENABLED,
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
    await page.goto(`${this.browserforce.getInstanceUrl()}/${PATHS.BASE}`);
    await page.waitFor(SELECTORS.ENABLED);
    await page.$eval(
      SELECTORS.ENABLED,
      (e: HTMLInputElement, v) => {
        e.checked = v;
      },
      config.enableSalesforceToSalesforce
    );
    await Promise.all([
      page.waitForNavigation(),
      page.click(SELECTORS.SAVE_BUTTON)
    ]);
  }
}
