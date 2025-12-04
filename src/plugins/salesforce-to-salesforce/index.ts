import pRetry from 'p-retry';
import { BrowserforcePlugin } from '../../plugin.js';

const BASE_PATH = '_ui/s2s/ui/PartnerNetworkEnable/e';

type Config = {
  enabled: boolean;
};

export class SalesforceToSalesforce extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    const page = await this.browserforce.openPage(BASE_PATH);
    const response = {
      enabled: true,
    };

    const checkedImageCount = await page
      .getByRole('img', { name: 'Checked' })
      .count();
    if (checkedImageCount === 0) {
      response.enabled = false;
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

      await page.locator('#penabled').check();
      await page.getByRole('button', { name: 'save' }).first().click();
      await page.close();

      const result = await this.retrieve();
      if (result.enabled !== config.enabled) {
        await page.close();
        throw new Error('setting was not applied as expected');
      }
    });
  }
}
