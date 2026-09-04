import type { Page } from 'playwright';
import type { SalesforceUrlPath } from '../../../../browserforce.js';
import { waitForPageErrors } from '../../../../page-errors.js';

export class FieldDependencyPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public static getUrl(customObjectId: string): SalesforceUrlPath {
    return `/setup/ui/dependencyList.jsp?tableEnumOrId=${customObjectId.substring(0, 15)}&setupid=CustomObjects`;
  }

  public async clickDeleteDependencyActionForField(customFieldId: string): Promise<FieldDependencyPage> {
    // wait for "new" button in field dependencies releated list header
    await this.page.locator('div.listRelatedObject div.pbHeader input[name="new"]').waitFor();
    const xpath = `//a[contains(@href, "/p/dependency/NewDependencyUI/e") and contains(@href, "delID=${customFieldId.substring(
      0,
      15,
    )}")]`;
    const actionLinks = await this.page.locator(`xpath=${xpath}`).all();
    if (actionLinks.length > 0) {
      this.page.on('dialog', async (dialog) => {
        await dialog.accept();
      });
      await Promise.all([
        Promise.race([this.page.waitForResponse(/setup\/ui\/dependencyList.jsp/), waitForPageErrors(this.page)]),
        actionLinks[0].click(),
      ]);
    }
    return new FieldDependencyPage(this.page);
  }
}
