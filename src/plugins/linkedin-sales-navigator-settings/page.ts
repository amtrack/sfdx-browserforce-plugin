import type { Page } from 'playwright';
import { waitForPageErrors } from '../../browserforce.js';

const ENABLE_TOGGLE =
  'div[data-aura-class="setup_sales_linkedinLinkedInSetupRow"] input[type="checkbox"]:not(:disabled)';

// unfortunately the divs intercept pointer events so we need to click on the label instead
const ENABLE_BUTTON =
  'div[data-aura-class="setup_sales_linkedinLinkedInSetupRow"]:has(input[type="checkbox"]:not(:disabled)) label';
const CONFIRM_CHECKBOX =
  'section[role="dialog"] lightning-input lightning-primitive-input-checkbox';
const ACCEPT_BUTTON =
  'section[role="dialog"] div div button:not(:disabled):nth-child(2)';

export class LinkedInSalesNavigatorPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public static getUrl(): string {
    return 'lightning/setup/LinkedInSalesNavigatorPage/home';
  }

  public async getStatus(): Promise<boolean> {
    const isEnabled = await this.page.locator(ENABLE_TOGGLE).isChecked();
    await this.page.close();
    return isEnabled;
  }

  public async setStatus(enable: boolean): Promise<void> {
    const afterSavePromise = Promise.race([
      this.page.waitForResponse(/LinkedInIntegrationSetup.updatePref=1/),
      waitForPageErrors(this.page),
    ]);
    if (enable) {
      await this.page.locator(ENABLE_BUTTON).click();
      await this.page.locator(CONFIRM_CHECKBOX).click();
      await this.page.locator(ACCEPT_BUTTON).click();
    } else {
      await this.page.locator(ENABLE_BUTTON).click();
    }
    await afterSavePromise;
    await this.page.close();
  }
}
