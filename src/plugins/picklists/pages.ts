import type { Page } from 'playwright';
import { waitForPageErrors } from '../../browserforce.js';

// table columns
//    <td> (actions) | <th> (label) | <td> (API name)
// notes:
// - label column is a th (which is not used)
// - xpath indices are 1 based

type PicklistValue = {
  value: string;
  active: boolean;
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
    const resolvePicklistValueNames = async (xpath: string) => {
      const locator = this.page.locator(`xpath=${xpath}`);
      const fullNames = await locator.allInnerTexts();
      return fullNames;
    };
    const active = await resolvePicklistValueNames(
      `//tr[td[1]//a[contains(@href, "/setup/ui/picklist_masteredit")]]//td[2]`
    );
    const inactive = await resolvePicklistValueNames(
      `//tr[td[1]//a[contains(@href, "/setup/ui/picklist_masteractivate")]]//td[2]`
    );
    return [
      ...active.map((x) => {
        return { value: x, active: true };
      }),
      ...inactive.map((x) => {
        return { value: x, active: false };
      }),
    ];
  }
  public async clickNewActionButton(): Promise<void> {
    const NEW_ACTION_BUTTON_XPATH =
      '//tr[td[2]]//input[contains(@onclick, "/setup/ui/picklist_masteredit")][@value=" New "]';
    await this.page.locator(`xpath=${NEW_ACTION_BUTTON_XPATH}`).first().click();
    await Promise.race([
      this.page.waitForURL(
        (url) => url.pathname === '/setup/ui/picklist_masteredit.jsp'
      ),
      waitForPageErrors(this.page),
    ]);
  }

  public async clickReplaceActionButton(): Promise<PicklistReplacePage> {
    const REPLACE_ACTION_BUTTON = 'input[name="replace"][type="button"]';
    await this.page.locator(REPLACE_ACTION_BUTTON).click();
    await Promise.race([
      this.page.waitForURL(
        (url) => url.pathname === '/setup/ui/replacePickList.jsp'
      ),
      waitForPageErrors(this.page),
    ]);
    return new PicklistReplacePage(this.page);
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
    const TEXT_AREA = 'textarea';
    if (newValue !== undefined && newValue !== null) {
      await this.page.locator(TEXT_AREA).fill(newValue);
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
    const LABEL_INPUT = 'input#p1';
    const API_NAME_INPUT = 'input#p3';
    const STATUS_CATEGORY_SELECTOR = 'select#p5';
    if (newValue !== undefined && newValue !== null) {
      await this.page.locator(LABEL_INPUT).fill(newValue);
      await this.page.locator(API_NAME_INPUT).fill(newValue);
      await this.page
        .locator(STATUS_CATEGORY_SELECTOR)
        .pressSequentially(statusCategory);
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
    newValue: string,
    replaceAllBlankValues?: boolean
  ): Promise<void> {
    const OLD_VALUE_SELECTOR = 'input#nf';
    const NEW_VALUE_SELECTOR = 'select#nv';
    const REPLACE_ALL_BLANK_VALUES_CHECKBOX = 'input#fnv';
    if (value !== undefined && value !== null) {
      await this.page.locator(OLD_VALUE_SELECTOR).fill(value);
    }
    if (replaceAllBlankValues) {
      await this.page.locator(REPLACE_ALL_BLANK_VALUES_CHECKBOX).check();
    }
    if (newValue !== undefined && newValue !== null) {
      await this.page.locator(NEW_VALUE_SELECTOR).pressSequentially(newValue);
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

  async replaceAndDelete(newValue?: string): Promise<void> {
    const NEW_VALUE_SELECTOR = 'select#p13';
    const REPLACE_WITH_BLANK_VALUE_RADIO_INPUT =
      'input#ReplaceValueWithNullValue';
    // select option value
    if (newValue !== undefined && newValue !== null) {
      await this.page.locator(NEW_VALUE_SELECTOR).pressSequentially(newValue);
    } else {
      await this.page.locator(REPLACE_WITH_BLANK_VALUE_RADIO_INPUT).check();
    }
  }

  async save(): Promise<void> {
    await this.page.locator(this.saveButton).click({ timeout: 180000 });
    // TODO: this might take really long
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
