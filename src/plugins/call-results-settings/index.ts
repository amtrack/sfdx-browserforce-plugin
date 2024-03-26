import { BrowserforcePlugin } from '../../plugin';
import { DialerLogACallSetupPage } from './page';

export type Config = {
  enabled: boolean;
};

export class CallResultsSettings extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const result = { enabled: false };
    const page = new DialerLogACallSetupPage(await this.browserforce.openPage(DialerLogACallSetupPage.getUrl()));
    result.enabled = await page.getStatus();
    return result;
  }

  public async apply(config: Config): Promise<void> {
    const page = new DialerLogACallSetupPage(await this.browserforce.openPage(DialerLogACallSetupPage.getUrl()));
    await page.setStatus();
  }
}
