import { BrowserforcePlugin } from '../../plugin';
import { OverviewPage } from './pages/overview';
import { SetupPage } from './pages/setup';

type Config = {
  enabled: boolean;
};

export class OpportunitySplits extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const page = await this.browserforce.openPage(OverviewPage.PATH);
    const overviewPage = new OverviewPage(page);
    const response = {
      enabled: await overviewPage.isEnabled()
    };
    return response;
  }

  public async apply(config: Config): Promise<void> {
    if (config.enabled) {
      const page = await this.browserforce.openPage(SetupPage.PATH);
      const setupPage = new SetupPage(page);
      const layoutSelectionPage = await setupPage.enable();
      const overviewPage = await layoutSelectionPage.choose();
      await overviewPage.waitUntilEnabled();
    } else {
      const page = await this.browserforce.openPage(OverviewPage.PATH);
      const overviewPage = new OverviewPage(page);
      await overviewPage.disable();
      await overviewPage.waitUntilDisabled();
    }
  }
}
