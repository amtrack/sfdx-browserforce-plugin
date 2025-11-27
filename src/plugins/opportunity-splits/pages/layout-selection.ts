import { Page } from 'playwright';
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
    await this.page.locator(SAVE_BUTTON).click();
    await this.page.waitForURL(
      (url) => url.pathname === '/opp/opportunitySplitSetupOverview.apexp'
    );
    return new OverviewPage(this.page);
  }
}
