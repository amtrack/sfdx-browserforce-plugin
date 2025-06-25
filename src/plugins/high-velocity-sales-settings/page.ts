import { type Page } from 'puppeteer';
import { throwPageErrors } from '../../browserforce.js';

const SET_UP_AND_ENABLE_HVS_BUTTON = 'button.setupAndEnableButton';
const ENABLE_TOGGLE = '#toggleHighVelocitySalesPref';
const AUTOMATION_TAB_ITEM_LINK =
  'lightning-tab-bar li[data-tab-value="automationTab"] a';

export class HighVelocitySalesSetupPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public static getUrl(): string {
    return 'lightning/setup/SalesEngagement/home';
  }

  public async setUpAndEnable(): Promise<void> {
    await this.page.locator(AUTOMATION_TAB_ITEM_LINK).click();
    await Promise.all([
      this.page.locator(ENABLE_TOGGLE).setTimeout(60_000).wait(),
      this.page.locator(SET_UP_AND_ENABLE_HVS_BUTTON).click(),
    ]);
    await throwPageErrors(this.page);
    await this.page.close();
  }
}
