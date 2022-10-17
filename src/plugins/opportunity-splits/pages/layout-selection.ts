import { Page } from 'puppeteer';
import { OverviewPage } from './overview';

const SAVE_BUTTON = 'input[id$=":save"]';

export class LayoutSelectionPage {
  static PATH =
    'opp/opportunitySplitSetupLayout.apexp?setupid=OpportunitySplitSetup';
  private page;

  constructor(page: Page) {
    this.page = page;
  }

  public async choose(): Promise<OverviewPage> {
    await this.page.waitForSelector(SAVE_BUTTON);
    await Promise.all([
      this.page.waitForNavigation(),
      this.page.click(SAVE_BUTTON)
    ]);
    return new OverviewPage(this.page);
  }
}
