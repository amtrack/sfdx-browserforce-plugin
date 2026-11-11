import type { Page } from 'playwright';
import { throwPageErrors, waitForPageErrors } from '../../../page-errors.js';
import { isPicklistUrl } from './default-picklist-add.js';
import { PicklistReplaceAndDeletePage } from './picklist-replace-and-delete.js';
import { PicklistValueEditPage } from './picklist-value-edit.js';
import { PicklistReplacePage } from './picklist-replace.js';

export type PicklistValue = {
  value: string;
  label?: string;
  active: boolean;
  id?: string;
  statusCategory?: string;
};

// table columns
//    <td> (actions) | <th> (label) | <td> (API name)
// notes:
// - label column is a th (which is not used)
// - xpath indices are 1 based

export class PicklistPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public async getPicklistValues(): Promise<PicklistValue[]> {
    // wait for New button for picklist values specifically
    await this.page.locator('input[name="new"][onclick*="picklist_masteredit"]').waitFor();
    // The sections unfortunately don't all have ids
    // - Field Dependencies
    // - Validation Rules #ValidationFormulaList
    // - Values <-- rows with a href matching picklist
    // - Inactive Values <-- rows a href matching picklist
    const rows = await this.page.locator('div.bRelatedList tr:has(td.actionColumn):has(a[href*="picklist"])').all();
    const picklists = await Promise.all(
      rows.map((row) =>
        (async () => {
          const urlPath = await row
            .locator('xpath=//td[1]//a[contains(@href, "/setup/ui/")]')
            .first()
            .getAttribute('href');
          const url = new URL(`http://localhost${urlPath}`);
          const picklistId = url.searchParams.get('id');
          const statusCategory = await row.locator('td').nth(2).textContent();
          return {
            id: picklistId,
            value: await row.locator('td').nth(1).textContent(),
            label: await row.locator('th').first().textContent(),
            active:
              (await row.locator('xpath=//td[1]//a[contains(@href, "/setup/ui/picklist_masteredit")]').count()) === 1,
            ...(statusCategory?.length ? { statusCategory } : {}),
          };
        })(),
      ),
    );
    return picklists;
  }
  public async clickNewActionButton(): Promise<void> {
    await this.page
      .locator('xpath=//tr[td[2]]//input[contains(@onclick, "/setup/ui/picklist_masteredit")][@value=" New "]')
      .first()
      .click();
    await Promise.race([
      this.page.waitForURL((url) => url.pathname === '/setup/ui/picklist_masteredit.jsp'),
      waitForPageErrors(this.page),
    ]);
  }

  public async clickReplaceActionButton(): Promise<PicklistReplacePage> {
    await this.page.locator('input[name="replace"][type="button"]').click();
    await Promise.race([
      this.page.waitForURL((url) => url.pathname === '/setup/ui/replacePickList.jsp'),
      waitForPageErrors(this.page),
    ]);
    return new PicklistReplacePage(this.page);
  }

  public async clickDeleteActionForValue(picklistValueApiName: string): Promise<PicklistReplaceAndDeletePage> {
    // deactivate: deleteType=1
    // delete: deleteType=0 or no deleteType=1
    const xpath = `//tr[td[2][text() = "${picklistValueApiName}"]]//td[1]//a[contains(@href, "/setup/ui/picklist_masterdelete.jsp") and not(contains(@href, "deleteType=1"))]`;
    this.page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    await this.page.locator(`xpath=${xpath}`).first().click();
    await Promise.race([
      this.page.waitForURL((url) => url.pathname === '/setup/ui/picklist_masterdelete.jsp'),
      waitForPageErrors(this.page),
    ]);
    return new PicklistReplaceAndDeletePage(this.page);
  }

  public async clickActivateDeactivateActionForValue(
    picklistValueApiName: string,
    active: boolean,
  ): Promise<PicklistPage> {
    let xpath;
    if (active) {
      xpath = `//tr[td[2][text() = "${picklistValueApiName}"]]//td[1]//a[contains(@href, "/setup/ui/picklist_masteractivate.jsp")]`;
    } else {
      // deactivate: deleteType=1
      // delete: deleteType=0 or no deleteType=1
      xpath = `//tr[td[2][text() = "${picklistValueApiName}"]]//td[1]//a[contains(@href, "/setup/ui/picklist_masterdelete.jsp") and contains(@href, "deleteType=1")]`;
    }
    // Follow the link rather than clicking it: Salesforce goes back to the picklist page, which is already the current
    // URL, so waiting for that URL after a click returns before Salesforce has processed the change.
    const action = active ? 'activate' : 'deactivate';
    const href = await this.page.locator(`xpath=${xpath}`).first().getAttribute('href');
    if (!href) {
      throw new Error(`Cannot ${action} the picklist value "${picklistValueApiName}": its link has no URL`);
    }
    await this.page.goto(new URL(href, this.page.url()).href);
    await throwPageErrors(this.page);
    if (!isPicklistUrl(new URL(this.page.url()))) {
      throw new Error(
        `Cannot ${action} the picklist value "${picklistValueApiName}": Salesforce opened ${new URL(this.page.url()).pathname}`,
      );
    }
    return new PicklistPage(this.page);
  }

  /**
   * Opens the edit page of an active value (inactive values have no Edit link).
   */
  public async clickEditActionForValue(picklistValueApiName: string): Promise<PicklistValueEditPage> {
    const xpath = `//tr[td[2][text() = "${picklistValueApiName}"]]//td[1]//a[contains(@href, "/setup/ui/picklist_masteredit.jsp")]`;
    await this.page.locator(`xpath=${xpath}`).first().click();
    await Promise.race([
      this.page.waitForURL((url) => url.pathname === '/setup/ui/picklist_masteredit.jsp'),
      waitForPageErrors(this.page),
    ]);
    return new PicklistValueEditPage(this.page);
  }
}
