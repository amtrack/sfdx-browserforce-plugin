import type { Page } from 'playwright';
import { waitForPageErrors } from '../../../page-errors.js';
import { RecordTypeDeletePage } from './record-type-delete.js';

export class RecordTypePage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public async clickDeleteAction(recordTypeId: string): Promise<RecordTypeDeletePage> {
    const xpath = `//a[contains(@href, "setup/ui/recordtypedelete.jsp?id=${recordTypeId.slice(0, 15)}")]`;
    await this.page.locator(`xpath=${xpath}`).first().click();
    await Promise.race([
      this.page.waitForURL((url) => url.pathname === '/setup/ui/recordtypedelete.jsp'),
      waitForPageErrors(this.page),
    ]);
    return new RecordTypeDeletePage(this.page);
  }
}
