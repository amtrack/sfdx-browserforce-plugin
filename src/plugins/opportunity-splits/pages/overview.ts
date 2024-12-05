import { Page } from 'puppeteer';

const COMPLETED = '#prefSettingSucceeded';
const DISABLE_LINK = 'div[id*=":disable_form:"] a';
const DISABLE_CONFIRM_CHECKBOX = 'input#dis_confirm';
const DISABLE_CONFIRM_BUTTON = 'input#splitsDisableConfirmDialog_overlayConfirmButton';

export class OverviewPage {
  static PATH = 'opp/opportunitySplitSetupOverview.apexp?setupid=OpportunitySplitSetup';
  private page;

  constructor(page: Page) {
    this.page = page;
  }

  public async isEnabled(): Promise<boolean> {
    return (await this.page.$(DISABLE_LINK)) !== null;
  }

  public async waitUntilCompleted(): Promise<void> {
    // 10 minutes
    await this.page.waitForSelector(COMPLETED, { timeout: 10 * 60 * 1000 });
  }

  public async disable(): Promise<OverviewPage> {
    await this.page.waitForSelector(DISABLE_LINK);
    await this.page.click(DISABLE_LINK);
    await this.page.waitForSelector(DISABLE_CONFIRM_CHECKBOX);
    await this.page.click(DISABLE_CONFIRM_CHECKBOX);
    await this.page.waitForSelector(DISABLE_CONFIRM_BUTTON);
    await Promise.all([this.page.waitForNavigation(), this.page.click(DISABLE_CONFIRM_BUTTON)]);
    return this;
  }
}
