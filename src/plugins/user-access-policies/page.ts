import type { Page } from 'puppeteer';
import { throwPageErrors } from '../../browserforce.js';

export class UserAccessPoliciesPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public static getPolicyUrl(policyId: string): string {
    return `lightning/setup/UserAccessPolicies/${policyId}/view`;
  }

  /**
   * Activate a policy from its detail page
   * @param triggerOn - When to trigger the policy: 'Create', 'Update', or 'CreateAndUpdate' (default)
   */
  public async activatePolicy(triggerOn: 'Create' | 'Update' | 'CreateAndUpdate' = 'CreateAndUpdate'): Promise<void> {
    try {
      const xpath = '//button[contains(., "Automate Policy")]';

      let automateButton = null;
      await this.page.waitForSelector(`::-p-xpath(${xpath})`, {
        timeout: 5000,
      });
      const buttons = await this.page.$$(`xpath/.${xpath}`);
      if (buttons.length > 0) {
        automateButton = buttons[0];
      }

      if (!automateButton) {
        throw new Error('Automate Policy button not found on page');
      }

      await this.waitForButtonEnabled(automateButton);

      await automateButton.click();

      await this.handleActivationModal(triggerOn);

      await throwPageErrors(this.page);
    } catch (error) {
      throw new Error(`Failed to activate policy: ${error.message}`);
    }
  }

  /**
   * Deactivate a policy from its detail page
   */
  public async deactivatePolicy(): Promise<void> {
    try {
      const xpath = '//button[contains(., "Deactivate")]';

      let deactivateButton = null;

      await this.page.waitForSelector(`::-p-xpath(${xpath})`, {
        timeout: 5000,
      });
      const buttons = await this.page.$$(`xpath/.${xpath}`);
      if (buttons.length > 0) {
        deactivateButton = buttons[0];
      }

      if (!deactivateButton) {
        throw new Error('Deactivate button not found on page');
      }

      await deactivateButton.click();

      await this.handleConfirmationModal();

      await throwPageErrors(this.page);
    } catch (error) {
      throw new Error(`Failed to deactivate policy: ${error.message}`);
    }
  }

  /**
   * Handle the activation modal (select trigger option and click Activate)
   */
  private async handleActivationModal(triggerOn: 'Create' | 'Update' | 'CreateAndUpdate'): Promise<void> {
    const modalHeaderXpath = '//lightning-modal-header[contains(@class, "automate_policy_modal")]';
    await this.page.waitForSelector(`::-p-xpath(${modalHeaderXpath})`, {
      timeout: 10000,
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const radioButtons = await this.page.$$('input[type="radio"]');

    if (radioButtons.length < 3) {
      throw new Error('Modal did not load - radio buttons not found');
    }

    let radioButton = null;
    for (const button of radioButtons) {
      const value = await this.page.evaluate((radio) => radio.value, button);
      if (value === triggerOn) {
        radioButton = button;
        break;
      }
    }

    if (!radioButton) {
      throw new Error(`Radio button with value "${triggerOn}" not found`);
    }

    const radioId = await this.page.evaluate((radio) => radio.id, radioButton);

    if (radioId) {
      const label = await this.page.$(`label[for="${radioId}"]`);

      await label.click();
    }

    const xpath = '//button[text()="Activate"] | //button[contains(text(), "Activate")]';
    await this.page.waitForSelector(`::-p-xpath(${xpath})`, { timeout: 5000 });
    const buttons = await this.page.$$(`xpath/.${xpath}`);

    if (buttons.length === 0) {
      throw new Error('Activate button not found in modal');
    }

    await buttons[0].click();

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  /**
   * Handle confirmation modal that may appear after deactivation
   */
  private async handleConfirmationModal(): Promise<void> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const xpath = '//lightning-modal-footer//button[text()="Deactivate"]';
      await this.page.waitForSelector(`::-p-xpath(${xpath})`, {
        timeout: 5000,
      });
      const buttons = await this.page.$$(`xpath/.${xpath}`);

      if (buttons.length === 0) {
        throw new Error('Deactivate button not found in confirmation modal');
      }

      await buttons[0].click();

      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (e) {
      throw new Error(`Failed to handle deactivation confirmation modal: ${e.message}`);
    }
  }

  /**
   * Wait for a button to become enabled
   * @param button - The button element to wait for
   * @param timeout - Maximum time to wait in milliseconds (default: 10000)
   */
  private async waitForButtonEnabled(button: any, timeout: number = 10000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const isDisabled = await this.page.evaluate((btn) => {
        return btn.disabled;
      }, button);

      if (!isDisabled) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error(`Button did not become enabled within ${timeout}ms`);
  }
}
