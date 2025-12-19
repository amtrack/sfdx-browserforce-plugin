import pRetry from 'p-retry';
import { BrowserforcePlugin } from '../../plugin.js';

const BASE_PATH = '_ui/s2s/ui/PartnerNetworkEnable/e';

const ENABLED_SELECTOR = '#penabled';
const BASE_SELECTOR = 'table.detailList';
const SAVE_BUTTON_SELECTOR = 'input[name="save"]';

type Config = {
  enabled: boolean;
};

export class SalesforceToSalesforce extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    const page = await this.browserforce.openPage(BASE_PATH);
    await page.waitForSelector(BASE_SELECTOR);
    const response = {
      enabled: true,
    };
    const inputEnable = await page.$(ENABLED_SELECTOR);
    if (inputEnable) {
      response.enabled = await page.$eval(ENABLED_SELECTOR, (el: HTMLInputElement) => el.checked);
    }
    await page.close();
    return response;
  }

  public async apply(config: Config): Promise<void> {
    if (config.enabled === false) {
      throw new Error('`enabled` cannot be disabled once enabled');
    }
    // sometimes the setting is not being applied although no error is being displayed
    await pRetry(async () => {
      const page = await this.browserforce.openPage(BASE_PATH);
      await page.waitForSelector(ENABLED_SELECTOR);
      await page.$eval(
        ENABLED_SELECTOR,
        (e: HTMLInputElement, v: boolean) => {
          e.checked = v;
        },
        config.enabled,
      );
      await Promise.all([page.waitForNavigation(), page.click(SAVE_BUTTON_SELECTOR)]);
      const result = await this.retrieve();
      await page.close();
      if (result.enabled !== config.enabled) {
        throw new Error('setting was not applied as expected');
      }
    });
  }
}
