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

type Config = {
  enabled: boolean;
};

export class SalesforceToSalesforce extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    const page = await this.browserforce.openPage(PATHS.BASE);
    await page.waitForSelector(SELECTORS.BASE);
    const response = {
      enabled: true
    };
    const inputEnable = await page.$(SELECTORS.ENABLED);
    if (inputEnable) {
      response.enabled = await page.$eval(
        SELECTORS.ENABLED,
        (el: HTMLInputElement) => el.checked
      );
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
      const page = await this.browserforce.openPage(PATHS.BASE);
      await page.waitForSelector(SELECTORS.ENABLED);
      await page.$eval(
        SELECTORS.ENABLED,
        (e: HTMLInputElement, v: boolean) => {
          e.checked = v;
        },
        config.enabled
      );
      await Promise.all([
        page.waitForNavigation(),
        page.click(SELECTORS.SAVE_BUTTON)
      ]);
      const result = await this.retrieve();
      await page.close();
      if (result.enabled !== config.enabled) {
        throw new Error('setting was not applied as expected');
      }
    });
  }
}
