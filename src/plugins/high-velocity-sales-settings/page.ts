import { Page } from 'puppeteer';
import { throwPageErrors } from '../../browserforce';

const SET_UP_AND_ENABLE_HVS_BUTTON = 'button.setupAndEnableButton';
const ENABLE_TOGGLE = '#toggleHighVelocitySalesPref';

export class HighVelocitySalesSetupPage {
  private page;

  constructor(page: Page) {
    this.page = page;
  }

  public static getUrl(): string {
    return 'lightning/setup/SalesEngagement/home';
  }

  public async setUpAndEnable(): Promise<void> {
    await this.page.waitForSelector(SET_UP_AND_ENABLE_HVS_BUTTON, {
      visible: true
    });
    await Promise.all([
      this.page.waitForSelector(ENABLE_TOGGLE, { timeout: 60_000 }),
      await this.page.click(SET_UP_AND_ENABLE_HVS_BUTTON)
    ]);
    await throwPageErrors(this.page);
    await this.page.close();
  }
}
