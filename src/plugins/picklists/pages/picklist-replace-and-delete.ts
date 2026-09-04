import type { Page } from 'playwright';
import { waitForPageErrors } from '../../../page-errors.js';
import { PicklistReplacePage } from './picklist-replace.js';

export class PicklistReplaceAndDeletePage extends PicklistReplacePage {
  constructor(page: Page) {
    super(page);
    this.saveButton = 'input[name="delID"][type="submit"]';
  }

  // fallow-ignore-next-line unused-class-member
  async replaceAndDelete(newValueId?: string): Promise<void> {
    if (newValueId !== undefined && newValueId !== null) {
      await this.page.locator('select#p13').describe('new value').selectOption(newValueId);
    } else {
      await this.page.locator('input#ReplaceValueWithNullValue').check();
    }
  }

  async save(): Promise<void> {
    // NOTE: This sometimes takes really long
    await this.page.locator(this.saveButton).click({ timeout: 300000 });
    await Promise.race([
      this.page.waitForURL(
        (url) =>
          url.pathname.startsWith('/00N') || // CustomField Definition
          url.pathname.startsWith('/0Nt') || // SharedPicklistDefinition
          url.pathname.startsWith('/_ui/common/config/field/StandardFieldAttributes'),
      ),
      waitForPageErrors(this.page, 120000), // 2 minutes
    ]);
  }
}
