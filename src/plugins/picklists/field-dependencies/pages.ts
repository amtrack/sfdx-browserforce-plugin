import type { Page } from 'playwright';
import { waitForPageErrors } from '../../../browserforce.js';

export class FieldDependencyPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public static getUrl(customObjectId: string): string {
    return `setup/ui/dependencyList.jsp?tableEnumOrId=${customObjectId.substring(
      0,
      15
    )}&setupid=CustomObjects`;
  }

  public async clickDeleteDependencyActionForField(
    customFieldId: string
  ): Promise<FieldDependencyPage> {
    // wait for "new" button in field dependencies releated list header
    await this.page
      .locator('div.listRelatedObject div.pbHeader input[name="new"]')
      .waitFor();
    const xpath = `//a[contains(@href, "/p/dependency/NewDependencyUI/e") and contains(@href, "delID=${customFieldId.substring(
      0,
      15
    )}")]`;
    const actionLinks = await this.page.locator(`xpath=${xpath}`).all();
    if (actionLinks.length > 0) {
      this.page.on('dialog', async (dialog) => {
        await dialog.accept();
      });
      await Promise.all([
        Promise.race([
          this.page.waitForResponse(/setup\/ui\/dependencyList.jsp/),
          waitForPageErrors(this.page),
        ]),
        actionLinks[0].click(),
      ]);
    }
    return new FieldDependencyPage(this.page);
  }
}

export class NewFieldDependencyPage {
  protected page: Page;
  protected saveButton = 'input[name="save"]';

  constructor(page: Page) {
    this.page = page;
  }

  public static getUrl(
    customObjectId: string,
    dependentFieldId: string,
    controllingFieldId: string
  ): string {
    return `p/dependency/NewDependencyUI/e?tableEnumOrId=${customObjectId.substring(
      0,
      15
    )}&setupid=CustomObjects&controller=${controllingFieldId.substring(
      0,
      15
    )}&dependent=${dependentFieldId.substring(
      0,
      15
    )}&retURL=/${customObjectId.substring(0, 15)}`;
  }

  async save(): Promise<void> {
    await this.page.locator(this.saveButton).first().click();
    await Promise.race([
      this.page.waitForURL(
        (url) => url.pathname === '/p/dependency/EditDependencyUI/e'
      ),
      waitForPageErrors(this.page),
    ]);

    // second step in wizard
    this.page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    await this.page.locator(this.saveButton).first().click();
    await Promise.race([
      this.page.waitForURL((url) => /\/01I\w{12}/.test(url.pathname)),
      waitForPageErrors(this.page),
    ]);
  }
}
