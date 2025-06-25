import { type Page } from 'puppeteer';
import { throwPageErrors } from '../../browserforce.js';

// NOTE: The input checkboxes are just 1 pixel and cannot be clicked. Click on the labels instead.
const ENABLE_CHECKBOX =
  'div[data-aura-class="setup_sales_linkedinLinkedInSetupRow"] input[type="checkbox"]:not(:disabled)';
const ENABLE_CHECKBOX_LABEL = 'label.sfaCheckboxToggle';
const CONFIRM_CHECKBOX =
  'lightning-input lightning-primitive-input-checkbox input[name="LinkedIn Sales Navigator Integration Acceptance Checkbox"]:not(:disabled)';
const CONFIRM_CHECKBOX_LABEL = `${CONFIRM_CHECKBOX} ~ label`;
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
    const isEnabled = await this.page
      .locator(ENABLE_CHECKBOX)
      .map((checkbox) => checkbox.checked)
      .wait();
    await this.page.close();
    return isEnabled;
  }

  public async setStatus(enable: boolean): Promise<void> {
    const promises = [
      this.page.waitForResponse((response) => {
        return (
          response.url().includes('LinkedInIntegrationSetup.updatePref=1') &&
          response.ok()
        );
      }),
      this.page.locator(ENABLE_CHECKBOX_LABEL).click(),
    ];
    if (enable) {
      promises.push(
        this.page.locator(CONFIRM_CHECKBOX_LABEL).click(),
        this.page.locator(ACCEPT_BUTTON).click()
      );
    }
    await Promise.all(promises);
    await throwPageErrors(this.page);
    await this.page.close();
  }
}
