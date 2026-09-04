import type { Page } from 'playwright';
import { waitForPageErrors } from '../../../page-errors.js';

export class PicklistReplacePage {
  protected page: Page;
  protected saveButton = 'input[name="save"]';

  constructor(page: Page) {
    this.page = page;
  }

  // fallow-ignore-next-line unused-class-member
  async replace(value: string, newValueLabel: string, replaceAllBlankValues?: boolean): Promise<void> {
    if (value !== undefined && value !== null) {
      await this.page.locator('input#nf').describe('old value').fill(value);
    }
    if (newValueLabel !== undefined && newValueLabel !== null) {
      await this.page.locator('select#nv').describe('new value').selectOption({ label: newValueLabel });
    }
    if (replaceAllBlankValues) {
      await this.page.locator('input#fnv').describe('replace all blank values').check();
    }
    await this.save();
  }

  async save(): Promise<void> {
    await this.page.locator(this.saveButton).click();
    await Promise.race([this.page.waitForURL((url) => url.searchParams.has('msg')), waitForPageErrors(this.page)]);
  }
}
