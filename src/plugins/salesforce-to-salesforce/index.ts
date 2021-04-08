import pRetry from 'p-retry';
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
    const page = await this.browserforce.openPage(PATHS.BASE);
    await page.waitForSelector(SELECTORS.BASE);
    const response = {};
    const inputEnable = await page.$(SELECTORS.ENABLED);
    if (inputEnable) {
      response['enabled'] = await page.$eval(
        SELECTORS.ENABLED,
        (el: HTMLInputElement) => el.checked
      );
    } else {
      // already enabled
      response['enabled'] = true;
    }
    return response;
  }

  public async apply(config) {
    if (config.enabled === false) {
      throw new Error('`enabled` cannot be disabled once enabled');
    }
    // sometimes the setting is not being applied although no error is being displayed
    await pRetry(async () => {
      const page = await this.browserforce.openPage(PATHS.BASE);
      await page.waitForSelector(SELECTORS.ENABLED);
      await page.$eval(
        SELECTORS.ENABLED,
        (e: HTMLInputElement, v) => {
          e.checked = v;
        },
        config.enabled
      );
      await Promise.all([
        page.waitForNavigation(),
        page.click(SELECTORS.SAVE_BUTTON)
      ]);
      const result = await this.retrieve();
      if (result['enabled'] !== config.enabled) {
        throw new Error('setting was not applied as expected');
      }
    });
  }
}
