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
    await Promise.race([
      this.page.waitForURL(
        (url) =>
          url.pathname.startsWith('/00N') || // CustomField Definition
          url.pathname.startsWith('/0Nt') || // SharedPicklistDefinition
          url.pathname.startsWith('/_ui/common/config/field/StandardFieldAttributes'),
      ),
      waitForPageErrors(this.page),
    ]);
  }
}
