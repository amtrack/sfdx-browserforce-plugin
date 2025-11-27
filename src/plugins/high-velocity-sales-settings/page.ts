import { Page } from 'playwright';
import { throwPageErrors } from '../../browserforce.js';

const SET_UP_AND_ENABLE_HVS_BUTTON = 'button.setupAndEnableButton';
const ENABLE_TOGGLE = '#toggleHighVelocitySalesPref';
const AUTOMATION_TAB_ITEM =
  'lightning-tab-bar li[data-tab-value="automationTab"]';

export class HighVelocitySalesSetupPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public static getUrl(): string {
    return 'lightning/setup/SalesEngagement/home';
  }

  public async setUpAndEnable(): Promise<void> {
    await this.page.locator(AUTOMATION_TAB_ITEM).waitFor();
    const tabCount = await this.page.locator(AUTOMATION_TAB_ITEM).count();
    if (tabCount > 0) {
      await this.page.locator(AUTOMATION_TAB_ITEM).click();
    }
    await this.page.locator(SET_UP_AND_ENABLE_HVS_BUTTON).waitFor();
    await this.page.locator(SET_UP_AND_ENABLE_HVS_BUTTON).click();
    await this.page.locator(ENABLE_TOGGLE).waitFor({ timeout: 90_000 });
    await throwPageErrors(this.page);
    await this.page.close();
  }
}
