import { Page } from 'puppeteer';
import { OverviewPage } from './overview.js';

const SAVE_BUTTON = 'input[id$=":save"]';

export class LayoutSelectionPage {
  static PATH =
    'opp/opportunitySplitSetupLayout.apexp?setupid=OpportunitySplitSetup';
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public async choose(): Promise<OverviewPage> {
    await Promise.all([
      this.page.waitForNavigation(),
      this.page.locator(SAVE_BUTTON).click(),
    ]);
    return new OverviewPage(this.page);
  }
}
