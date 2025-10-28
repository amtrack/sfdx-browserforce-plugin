import { Page } from 'playwright';
import { throwPageErrors } from '../../browserforce.js';

const ENABLE_TOGGLE =
  'div[data-aura-class="setup_sales_linkedinLinkedInSetupRow"] input[type="checkbox"]:not(:disabled)';
const CONFIRM_CHECKBOX =
  'lightning-input lightning-primitive-input-checkbox input[name="LinkedIn Sales Navigator Integration Acceptance Checkbox"]:not(:disabled)';
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
    await this.page.locator(ENABLE_TOGGLE).waitFor();
    const isEnabled = await this.page.locator(ENABLE_TOGGLE).isChecked();
    await this.page.close();
    return isEnabled;
  }

  public async setStatus(enable: boolean): Promise<void> {
    // NOTE: Unfortunately a simple click() on the locator does not work here
    await this.page.locator(ENABLE_TOGGLE).waitFor();
    await this.page.locator(ENABLE_TOGGLE).evaluate((checkbox: HTMLInputElement) => checkbox.click());

    if (enable) {
      await this.page.locator(CONFIRM_CHECKBOX).waitFor();
      await this.page.locator(CONFIRM_CHECKBOX).evaluate((checkbox: HTMLInputElement) => checkbox.click());
      await this.page.locator(ACCEPT_BUTTON).waitFor();
      await this.page.locator(ACCEPT_BUTTON).evaluate((button: HTMLButtonElement) => button.click());
    }

    await throwPageErrors(this.page);
    await this.page.close();
  }
}
