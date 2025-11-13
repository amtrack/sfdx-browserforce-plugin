import { Page } from 'playwright';

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
      this.page.url().includes(OverviewPage.PATH) &&
      (await this.page.locator(DISABLE_LINK).count()) > 0
    );
  }

  public async waitUntilCompleted(): Promise<void> {
    if (await this.isInProgress()) {
      await this.page
        .locator(COMPLETED)
        .waitFor({ timeout: 10 * 60 * 1000 }); // 10 minutes
    }
  }

  public async isInProgress(): Promise<boolean> {
    return (await this.page.locator(IN_PROGRESS).count()) > 0;
  }

  public async disable(): Promise<OverviewPage> {
    await this.page.locator(DISABLE_LINK).click();
    await this.page.locator(DISABLE_CONFIRM_CHECKBOX).click();
    await this.page.locator(DISABLE_CONFIRM_BUTTON).click();
    await this.page.waitForLoadState('networkidle');
    return this;
  }
}
