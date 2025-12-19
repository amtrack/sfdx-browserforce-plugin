import { BrowserforcePlugin } from '../../plugin.js';
import { LinkedInSalesNavigatorPage } from './page.js';

export type Config = {
  enabled: boolean;
};

export class LinkedInSalesNavigatorSettings extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const result = { enabled: false };
    const page = new LinkedInSalesNavigatorPage(await this.browserforce.openPage(LinkedInSalesNavigatorPage.getUrl()));
    result.enabled = await page.getStatus();
    return result;
  }

  public async apply(config: Config): Promise<void> {
    const page = new LinkedInSalesNavigatorPage(await this.browserforce.openPage(LinkedInSalesNavigatorPage.getUrl()));
    await page.setStatus(config.enabled);
  }
}
