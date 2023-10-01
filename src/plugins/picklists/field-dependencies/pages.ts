import { Page } from 'puppeteer';
import { throwPageErrors } from '../../../browserforce';

export class FieldDependencyPage {
  private page;

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
    await this.page.waitForSelector(
      'div.listRelatedObject div.pbHeader input[name="new"]'
    );
    const xpath = `//a[contains(@href, "/p/dependency/NewDependencyUI/e") and contains(@href, "delID=${customFieldId.substring(
      0,
      15
    )}")]`;
    const actionLinkHandles = await this.page.$x(xpath);
    if (actionLinkHandles.length) {
      this.page.on('dialog', async dialog => {
        await dialog.accept();
      });
      await Promise.all([
        this.page.waitForNavigation(),
        this.page.evaluate((e) => e.click(), actionLinkHandles[0])
      ]);
      await throwPageErrors(this.page);
    }
    return this.page;
  }
}

export class NewFieldDependencyPage {
  protected page;
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
    await this.page.waitForSelector(this.saveButton);
    await Promise.all([
      this.page.waitForNavigation(),
      this.page.click(this.saveButton)
    ]);
    await throwPageErrors(this.page);
    // second step in wizard
    this.page.on('dialog', async dialog => {
      await dialog.accept();
    });
    await this.page.waitForSelector(this.saveButton);
    await Promise.all([
      this.page.waitForNavigation(),
      this.page.click(this.saveButton)
    ]);
    await throwPageErrors(this.page);
    await this.page.close();
  }
}
