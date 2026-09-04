import type { Page } from 'playwright';
import { waitForPageErrors } from '../../../page-errors.js';

export class StatusPicklistAddPage {
  protected page: Page;
  protected saveButton = 'input.btn[name="save"]';

  constructor(page: Page) {
    this.page = page;
  }

  async add(newValue: string, statusCategory: string): Promise<void> {
    if (newValue !== undefined && newValue !== null) {
      await this.page.locator('input#p1').describe('label').fill(newValue);
      await this.page.locator('input#p3').describe('api name').fill(newValue);
      await this.page.locator('select#p5').selectOption({ label: statusCategory });
    }
    await this.save();
  }

  async save(): Promise<void> {
    await this.page.locator(this.saveButton).click();
    await Promise.race([
      this.page.waitForURL((url) => url.pathname === '/_ui/common/config/field/StandardFieldAttributes/d'),
      waitForPageErrors(this.page),
    ]);
  }
}
