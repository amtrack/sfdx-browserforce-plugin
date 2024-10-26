import { Page } from 'puppeteer';
import { throwPageErrors } from '../../browserforce.js';

const ENABLE_TOGGLE = 'div[data-aura-class="setup_sales_linkedinLinkedInSetupRow"] input[type="checkbox"]';
const CONFIRM_CHECKBOX =
  'pierce/lightning-primitive-input-checkbox input[name="LinkedIn Sales Navigator Integration Acceptance Checkbox"]';
const ACCEPT_BUTTON =
  'section[data-aura-class="setup_sales_linkedinLinkedInSetupAcceptTermsModal"] div div button:not(:disabled):nth-child(2)';

export class LinkedInSalesNavigatorPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public static getUrl(): string {
    return 'lightning/setup/LinkedInSalesNavigatorPage/home';
  }

  public async getStatus(): Promise<boolean> {
    await this.page.waitForSelector(ENABLE_TOGGLE, { visible: true });
    const isEnabled = await this.page.$eval(ENABLE_TOGGLE, (el: HTMLInputElement) => el.checked);
    await this.page.close();
    return isEnabled;
  }

  public async setStatus(enable: boolean): Promise<void> {
    await this.page.waitForSelector(ENABLE_TOGGLE, { visible: true });
    await this.page.click(ENABLE_TOGGLE);

    if (enable) {
      await this.page.waitForSelector(CONFIRM_CHECKBOX, { visible: true });
      const checkbox = await this.page.$(CONFIRM_CHECKBOX);
      await checkbox?.evaluate((input: HTMLInputElement) => input.click());
      await this.page.waitForSelector(ACCEPT_BUTTON, { visible: true });
      await this.page.click(ACCEPT_BUTTON);
    }

    await throwPageErrors(this.page);
    await this.page.close();
  }
}
