import { BrowserforcePlugin } from '../../plugin.js';
import { LinkedInSalesNavigatorPage } from './page.js';

export type Config = {
  enabled: boolean;
};

export class LinkedInSalesNavigatorSettings extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const result = { enabled: false };
    await using page = await this.browserforce.openPage(LinkedInSalesNavigatorPage.getUrl());
    const linkedIn = new LinkedInSalesNavigatorPage(page);
    result.enabled = await linkedIn.getStatus();
    return result;
  }

  public async apply(config: Config): Promise<void> {
    await using page = await this.browserforce.openPage(LinkedInSalesNavigatorPage.getUrl());
    const linkedIn = new LinkedInSalesNavigatorPage(page);
    await linkedIn.setStatus(config.enabled);
  }
}
