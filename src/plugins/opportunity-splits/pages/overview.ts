import { Page } from 'puppeteer';

const IN_PROGRESS = '#enablingInProgress, #disablingInProgress';
const COMPLETED = '#prefSettingSucceeded';
const DISABLE_LINK = 'div[id*=":disable_form:"] a';
const DISABLE_CONFIRM_CHECKBOX = 'input#dis_confirm';
const DISABLE_CONFIRM_BUTTON =
  'input#splitsDisableConfirmDialog_overlayConfirmButton';

export class OverviewPage {
  static PATH =
    'opp/opportunitySplitSetupOverview.apexp?setupid=OpportunitySplitSetup';
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public async isEnabled(): Promise<boolean> {
    await this.waitUntilCompleted();
    return (
      (await this.page.url()).includes(OverviewPage.PATH) &&
      (await this.page.$(DISABLE_LINK)) !== null
    );
  }

  public async waitUntilCompleted(): Promise<void> {
    if (await this.isInProgress()) {
      await this.page
        .locator(COMPLETED)
        .setTimeout(10 * 60 * 1000) // 10 minutes
        .wait();
    }
  }

  public async isInProgress(): Promise<boolean> {
    return (await this.page.$(IN_PROGRESS)) !== null;
  }

  public async disable(): Promise<OverviewPage> {
    await this.page.locator(DISABLE_LINK).click();
    await this.page.locator(DISABLE_CONFIRM_CHECKBOX).click();
    await Promise.all([
      this.page.waitForNavigation(),
      this.page.locator(DISABLE_CONFIRM_BUTTON).click(),
    ]);
    return this;
  }
}
