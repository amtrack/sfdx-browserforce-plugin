import { type Page } from 'puppeteer';
import { BrowserforcePlugin } from '../../plugin.js';
import { OverviewPage } from './pages/overview.js';
import { SetupPage } from './pages/setup.js';

type Config = {
  enabled: boolean;
};

export class OpportunitySplits extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const page = await this.browserforce.openPage(OverviewPage.PATH);
    const overviewPage = new OverviewPage(page);
    const response = {
      enabled: await overviewPage.isEnabled(),
    };
    await page.close();
    return response;
  }

  public async apply(config: Config): Promise<void> {
    let page: Page;
    if (config.enabled) {
      page = await this.browserforce.openPage(SetupPage.PATH);
      const setupPage = new SetupPage(page);
      const layoutSelectionPage = await setupPage.enable();
      const overviewPage = await layoutSelectionPage.choose();
      await overviewPage.waitUntilCompleted();
    } else {
      page = await this.browserforce.openPage(OverviewPage.PATH);
      const overviewPage = new OverviewPage(page);
      await overviewPage.disable();
      await overviewPage.waitUntilCompleted();
    }
    await page.close();
  }
}
