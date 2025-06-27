import { Page } from 'puppeteer';
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
    await this.page.waitForSelector(AUTOMATION_TAB_ITEM);
    const tab = await this.page.$(AUTOMATION_TAB_ITEM);
    if (tab) {
      await this.page.evaluate((e: HTMLElement) => e.click(), tab);
    }
    await this.page.waitForSelector(SET_UP_AND_ENABLE_HVS_BUTTON);
    const enableButton = await this.page.$(SET_UP_AND_ENABLE_HVS_BUTTON);
    await Promise.all([
      this.page.waitForSelector(ENABLE_TOGGLE, { timeout: 60_000 }),
      this.page.evaluate((e: HTMLElement) => e.click(), enableButton!),
    ]);
    await throwPageErrors(this.page);
    await this.page.close();
  }
}
