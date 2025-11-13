import type { Page } from 'playwright';
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
      const automateButton = this.page.getByRole('button', { name: 'Automate Policy' });
      
      await automateButton.waitFor({ state: 'visible', timeout: 5000 });
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
      const deactivateButton = this.page.getByRole('button', { name: 'Deactivate' });
      
      await deactivateButton.waitFor({ state: 'visible', timeout: 5000 });
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
    const modalHeader = this.page.locator('lightning-modal-header.automate_policy_modal');
    await modalHeader.waitFor({ state: 'visible', timeout: 10000 });
    
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

    const activateButton = this.page.getByRole('button', { name: 'Activate', exact: true });
    await activateButton.waitFor({ state: 'visible', timeout: 5000 });
    await activateButton.click();

    await this.page.waitForTimeout(1000);
  }

  /**
   * Handle confirmation modal that may appear after deactivation
   */
  private async handleConfirmationModal(): Promise<void> {
    try {
      await this.page.waitForTimeout(500);
      
      const deactivateButton = this.page.locator('lightning-modal-footer button:has-text("Deactivate")');
      await deactivateButton.waitFor({ state: 'visible', timeout: 5000 });
      await deactivateButton.click();
      
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