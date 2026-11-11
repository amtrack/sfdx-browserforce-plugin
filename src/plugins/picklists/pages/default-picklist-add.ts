import type { Page } from 'playwright';
import { waitForPageErrors } from '../../../page-errors.js';

export class DefaultPicklistAddPage {
  protected page: Page;
  protected saveButton = 'input.btn[name="save"]';

  constructor(page: Page) {
    this.page = page;
  }

  async add(newValue: string): Promise<void> {
    if (newValue !== undefined && newValue !== null) {
      await this.page.locator('textarea').fill(newValue);
    }
    await this.save();
  }

  async save(): Promise<void> {
    await this.page.locator(this.saveButton).click();
    await Promise.race([this.page.waitForURL(isPicklistUrl), waitForPageErrors(this.page)]);
  }
}

/**
 * Whether the URL is the page of a picklist, where Salesforce goes back after a change to one of its values.
 */
export function isPicklistUrl(url: URL): boolean {
  return (
    url.pathname.startsWith('/00N') || // CustomField Definition
    url.pathname.startsWith('/0Nt') || // SharedPicklistDefinition
    url.pathname.startsWith('/_ui/common/config/field/StandardFieldAttributes') ||
    url.pathname === '/setup/ui/picklist_masterdetail.jsp' // StandardValueSet without a field (Salutation, roles)
  );
}
