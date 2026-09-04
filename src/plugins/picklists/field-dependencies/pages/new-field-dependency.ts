import type { Page } from 'playwright';
import type { SalesforceUrlPath } from '../../../../browserforce.js';
import { waitForPageErrors } from '../../../../page-errors.js';

export class NewFieldDependencyPage {
  protected page: Page;
  protected saveButton = 'input[name="save"]';

  constructor(page: Page) {
    this.page = page;
  }

  public static getUrl(
    customObjectId: string,
    dependentFieldId: string,
    controllingFieldId: string,
  ): SalesforceUrlPath {
    return `/p/dependency/NewDependencyUI/e?tableEnumOrId=${customObjectId.substring(
      0,
      15,
    )}&setupid=CustomObjects&controller=${controllingFieldId.substring(0, 15)}&dependent=${dependentFieldId.substring(
      0,
      15,
    )}&retURL=/${customObjectId.substring(0, 15)}`;
  }

  async save(): Promise<void> {
    await this.page.locator(this.saveButton).first().click();
    await Promise.race([
      this.page.waitForURL((url) => url.pathname === '/p/dependency/EditDependencyUI/e'),
      waitForPageErrors(this.page),
    ]);

    // second step in wizard
    this.page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    await this.page.locator(this.saveButton).first().click();
    await Promise.race([this.page.waitForURL((url) => /\/01I\w{12}/.test(url.pathname)), waitForPageErrors(this.page)]);
  }
}
