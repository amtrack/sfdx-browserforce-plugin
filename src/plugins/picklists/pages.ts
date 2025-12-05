import type { Page } from 'playwright';
import { waitForPageErrors } from '../../browserforce.js';

// table columns
//    <td> (actions) | <th> (label) | <td> (API name)
// notes:
// - label column is a th (which is not used)
// - xpath indices are 1 based

type PicklistValue = {
  value: string;
  label?: string;
  active: boolean;
  id?: string;
  statusCategory?: string;
};

export class PicklistPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public async getPicklistValues(): Promise<PicklistValue[]> {
    // wait for New button for picklist values specifically
    await this.page
      .locator('input[name="new"][onclick*="picklist_masteredit"]')
      .waitFor();
    const rows = await this.page
      .locator('div.bRelatedList tr:has(td.actionColumn):has(a)')
      .all();
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
              (await row
                .locator(
                  'xpath=//td[1]//a[contains(@href, "/setup/ui/picklist_masteredit")]'
                )
                .count()) === 1,
            ...(statusCategory?.length ? { statusCategory } : {}),
          };
        })()
      )
    );
    return picklists;
  }
  public async clickNewActionButton(): Promise<void> {
    await this.page
      .locator(
        'xpath=//tr[td[2]]//input[contains(@onclick, "/setup/ui/picklist_masteredit")][@value=" New "]'
      )
      .first()
      .click();
    await Promise.race([
      this.page.waitForURL(
        (url) => url.pathname === '/setup/ui/picklist_masteredit.jsp'
      ),
      waitForPageErrors(this.page),
    ]);
  }

  public async clickReplaceActionButton(): Promise<PicklistReplacePage> {
    await this.page.locator('input[name="replace"][type="button"]').click();
    await Promise.race([
      this.page.waitForURL(
        (url) => url.pathname === '/setup/ui/replacePickList.jsp'
      ),
      waitForPageErrors(this.page),
    ]);
    return new PicklistReplacePage(this.page);
  }

  public async getPicklistIdForApiName(
    picklistValueApiName: string
  ): Promise<string> {
    const link = this.page.locator(
      `//tr[td[2][text() = "${picklistValueApiName}"]]//td[1]//a[contains(@href, "/setup/ui/picklist_masteredit.jsp")]`
    );
    const urlPath = await link.getAttribute('href');
    const url = new URL(`http://localhost${urlPath}`);
    const picklistId = url.searchParams.get('id');
    return picklistId;
  }

  public async clickDeleteActionForValue(
    picklistValueApiName: string
  ): Promise<PicklistReplaceAndDeletePage> {
    // deactivate: deleteType=1
    // delete: deleteType=0 or no deleteType=1
    const xpath = `//tr[td[2][text() = "${picklistValueApiName}"]]//td[1]//a[contains(@href, "/setup/ui/picklist_masterdelete.jsp") and not(contains(@href, "deleteType=1"))]`;
    this.page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    await this.page.locator(`xpath=${xpath}`).first().click();
    await Promise.race([
      this.page.waitForURL(
        (url) => url.pathname === '/setup/ui/picklist_masterdelete.jsp'
      ),
      waitForPageErrors(this.page),
    ]);
    return new PicklistReplaceAndDeletePage(this.page);
  }

  public async clickActivateDeactivateActionForValue(
    picklistValueApiName: string,
    active: boolean
  ): Promise<PicklistPage> {
    let xpath;
    if (active) {
      xpath = `//tr[td[2][text() = "${picklistValueApiName}"]]//td[1]//a[contains(@href, "/setup/ui/picklist_masteractivate.jsp")]`;
    } else {
      // deactivate: deleteType=1
      // delete: deleteType=0 or no deleteType=1
      xpath = `//tr[td[2][text() = "${picklistValueApiName}"]]//td[1]//a[contains(@href, "/setup/ui/picklist_masterdelete.jsp") and contains(@href, "deleteType=1")]`;
    }
    this.page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await this.page.locator(`xpath=${xpath}`).first().click();
    await Promise.race([
      this.page.waitForURL((url) => /\/00N.*/.test(url.pathname)), // Salesforce record id
      waitForPageErrors(this.page),
    ]);
    return new PicklistPage(this.page);
  }
}

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
    const urlBefore = this.page.url();
    await this.page.locator(this.saveButton).click();
    await Promise.race([
      this.page.waitForURL((url) => url.href !== urlBefore),
      waitForPageErrors(this.page),
    ]);
  }
}

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
      await this.page
        .locator('select#p5')
        .selectOption({ label: statusCategory });
    }
    await this.save();
  }

  async save(): Promise<void> {
    await this.page.locator(this.saveButton).click();
    await Promise.race([
      this.page.waitForURL(
        (url) =>
          url.pathname === '/_ui/common/config/field/StandardFieldAttributes/d'
      ),
      waitForPageErrors(this.page),
    ]);
  }
}

export class PicklistReplacePage {
  protected page: Page;
  protected saveButton = 'input[name="save"]';

  constructor(page: Page) {
    this.page = page;
  }

  async replace(
    value: string,
    newValueLabel: string,
    replaceAllBlankValues?: boolean
  ): Promise<void> {
    if (value !== undefined && value !== null) {
      await this.page.locator('input#nf').describe('old value').fill(value);
    }
    if (newValueLabel !== undefined && newValueLabel !== null) {
      await this.page
        .locator('select#nv')
        .describe('new value')
        .selectOption({ label: newValueLabel });
    }
    if (replaceAllBlankValues) {
      await this.page
        .locator('input#fnv')
        .describe('replace all blank values')
        .check();
    }
    await this.save();
  }

  async save(): Promise<void> {
    await this.page.locator(this.saveButton).click();
    await Promise.race([
      this.page.waitForURL((url) => url.searchParams.has('msg')),
      waitForPageErrors(this.page),
    ]);
  }
}

export class PicklistReplaceAndDeletePage extends PicklistReplacePage {
  constructor(page: Page) {
    super(page);
    this.saveButton = 'input[name="delID"][type="submit"]';
  }

  async replaceAndDelete(newValueId?: string): Promise<void> {
    if (newValueId !== undefined && newValueId !== null) {
      await this.page
        .locator('select#p13')
        .describe('new value')
        .selectOption(newValueId);
    } else {
      await this.page.locator('input#ReplaceValueWithNullValue').check();
    }
  }

  async save(): Promise<void> {
    await this.page.locator(this.saveButton).click({ timeout: 300_000 }); // 5 minutes
    // NOTE: this might take really long
    // await this.page.locator(this.saveButton).click({ noWaitAfter: true });
    // /setup/ui/picklist_masterdelete.jsp?id=01JPw00000S7y4B&tid=a02&...
    // ->
    // /setup/ui/picklist_masterdelete.jsp
    await Promise.race([
      this.page.waitForURL((url) => !url.searchParams.has('id')),
      waitForPageErrors(this.page),
    ]);
  }
}
