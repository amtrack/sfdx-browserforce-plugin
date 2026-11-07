import type { Page } from 'playwright';
import type { SalesforceUrlPath } from '../../browserforce.js';
import { waitForPageErrors } from '../../page-errors.js';

export class UserAccessPoliciesPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public static getPolicyUrl(policyId: string): SalesforceUrlPath {
    return `/lightning/setup/UserAccessPolicies/${policyId}/view`;
  }

  /**
   * Classic page listing the users of a policy, with its Apply To All button
   */
  public static getApplyToAllUrl(policyId: string): SalesforceUrlPath {
    return `/005?id=${policyId.substring(0, 15)}&isUserEntityOverride=1`;
  }

  /**
   * Click Apply To All on the page of getApplyToAllUrl()
   */
  public async applyToAll(): Promise<void> {
    // Apply To All asks no confirmation today: accept one if Salesforce adds it
    this.page.on('dialog', (dialog) => dialog.accept().catch(() => undefined));
    // the id stays the same whatever the language of the user
    const applyButton = this.page.locator('#apply_policy_btn');
    // The page usually reloads after the click, but the proof that Salesforce ran the policy is the
    // UserAccessChange row the plugin waits for next: a page that does not reload is not a failure
    await Promise.all([
      Promise.race([
        waitForPageErrors(this.page),
        this.page.waitForEvent('load', { timeout: 30_000 }).catch(() => undefined),
      ]),
      applyButton.click(),
    ]);
  }

  /**
   * Activate a policy from its detail page
   * @param triggerOn - When to trigger the policy: 'Create', 'Update', or 'CreateAndUpdate' (default)
   */
  public async activatePolicy(triggerOn: 'Create' | 'Update' | 'CreateAndUpdate' = 'CreateAndUpdate'): Promise<void> {
    try {
      const automateButton = this.page.getByRole('button', {
        name: 'Automate Policy',
      });

      await automateButton.waitFor({ timeout: 5000 });
      await this.waitForButtonEnabled(automateButton);
      await automateButton.click();

      await this.handleActivationModal(triggerOn);
    } catch (error) {
      throw new Error(`Failed to activate policy: ${error.message}`);
    }
  }

  /**
   * Deactivate a policy from its detail page
   */
  public async deactivatePolicy(): Promise<void> {
    try {
      const deactivateButton = this.page.getByRole('button', {
        name: 'Deactivate',
      });

      await deactivateButton.waitFor({ timeout: 5000 });
      await deactivateButton.click();

      await this.handleConfirmationModal();
    } catch (error) {
      throw new Error(`Failed to deactivate policy: ${error.message}`);
    }
  }

  /**
   * Handle the activation modal (select trigger option and click Activate)
   */
  private async handleActivationModal(triggerOn: 'Create' | 'Update' | 'CreateAndUpdate'): Promise<void> {
    const modalHeader = this.page.locator('lightning-modal-header.automate_policy_modal');
    await modalHeader.waitFor({ timeout: 10000 });

    await this.page.waitForTimeout(500);

    const radioButtons = this.page.locator('input[type="radio"]');
    const radioCount = await radioButtons.count();

    if (radioCount < 3) {
      throw new Error('Modal did not load - radio buttons not found');
    }

    let radioButton = null;
    for (let i = 0; i < radioCount; i++) {
      const button = radioButtons.nth(i);
      const value = await button.getAttribute('value');
      if (value === triggerOn) {
        radioButton = button;
        break;
      }
    }

    if (!radioButton) {
      throw new Error(`Radio button with value "${triggerOn}" not found`);
    }

    const radioId = await radioButton.getAttribute('id');

    if (radioId) {
      const label = this.page.locator(`label[for="${radioId}"]`);
      await label.click();
    }

    const activateButton = this.page.getByRole('button', {
      name: 'Activate',
      exact: true,
    });
    await activateButton.waitFor({ timeout: 5000 });
    await activateButton.click();

    // TODO: use a better indicator
    await this.page.waitForTimeout(1000);
  }

  /**
   * Handle confirmation modal that may appear after deactivation
   */
  private async handleConfirmationModal(): Promise<void> {
    try {
      await this.page.waitForTimeout(500);

      const deactivateButton = this.page.locator('lightning-modal-footer button:has-text("Deactivate")');
      await deactivateButton.waitFor({ timeout: 5000 });
      await deactivateButton.click();

      // TODO: use a better indicator
      await this.page.waitForTimeout(1000);
    } catch (e) {
      throw new Error(`Failed to handle deactivation confirmation modal: ${e.message}`);
    }
  }

  /**
   * Wait for a button to become enabled
   * @param button - The button locator to wait for
   * @param timeout - Maximum time to wait in milliseconds (default: 10000)
   */
  private async waitForButtonEnabled(button: any, timeout: number = 10000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const isDisabled = await button.isDisabled();

      if (!isDisabled) {
        return;
      }

      await this.page.waitForTimeout(500);
    }

    throw new Error(`Button did not become enabled within ${timeout}ms`);
  }
}
