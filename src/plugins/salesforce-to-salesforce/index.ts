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
    await page.locator(BASE_SELECTOR).waitFor();
    const response = {
      enabled: true,
    };
    const inputEnableCount = await page.locator(ENABLED_SELECTOR).count();
    if (inputEnableCount > 0) {
      response.enabled = await page.locator(ENABLED_SELECTOR).isChecked();
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
      await page.locator(ENABLED_SELECTOR).waitFor();
      await page.locator(ENABLED_SELECTOR).evaluate(
        (e: HTMLInputElement, v: boolean) => {
          e.checked = v;
        },
        config.enabled
      );
      await Promise.all([
        page.waitForLoadState('load'),
        page.locator(SAVE_BUTTON_SELECTOR).click(),
      ]);
      const result = await this.retrieve();
      await page.close();
      if (result.enabled !== config.enabled) {
        throw new Error('setting was not applied as expected');
      }
    });
  }
}
