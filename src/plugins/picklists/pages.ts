import pRetry from 'p-retry';
import { JSHandle, Page } from 'puppeteer';

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
  private page;

  constructor(page: Page) {
    this.page = page;
  }

  public async getPicklistValues(): Promise<Array<PicklistValue>> {
    // wait for New button in any related list
    await this.page.waitForSelector('body table input[name="new"]');
    const resolvePicklistValueNames = async xpath => {
      const fullNameHandles = await this.page.$x(xpath);
      const innerTextJsHandles = await Promise.all<JSHandle<string>>(
        fullNameHandles.map(handle => handle.getProperty('innerText'))
      );
      const fullNames = await Promise.all<string>(
        innerTextJsHandles.map(handle => handle.jsonValue())
      );
      return fullNames;
    };
    const active = await resolvePicklistValueNames(
      `//tr[td[1]//a[contains(@href, "/setup/ui/picklist_masteredit")]]//td[2]`
    );
    const inactive = await resolvePicklistValueNames(
      `//tr[td[1]//a[contains(@href, "/setup/ui/picklist_masteractivate")]]//td[2]`
    );
    return [
      ...active.map(x => {
        return { value: x, active: true };
      }),
      ...inactive.map(x => {
        return { value: x, active: false };
      })
    ];
  }
  public async clickNewActionButton(): Promise<void> {
    const NEW_ACTION_BUTTON_XPATH =
      '//tr[td[2]]//input[contains(@onclick, "/setup/ui/picklist_masteredit")][@value=" New "]';
    await this.page.waitForXPath(NEW_ACTION_BUTTON_XPATH);
    const newActionButton = (await this.page.$x(NEW_ACTION_BUTTON_XPATH))[0];
    await Promise.all([
      this.page.waitForNavigation(),
      this.page.evaluate((e) => e.click(), newActionButton)
    ]);
  }

  public async clickReplaceActionButton(): Promise<PicklistReplacePage> {
    const REPLACE_ACTION_BUTTON = 'input[name="replace"]';
    await this.page.waitForSelector(REPLACE_ACTION_BUTTON);
    await Promise.all([
      this.page.waitForNavigation(),
      this.page.click(REPLACE_ACTION_BUTTON)
    ]);
    return new PicklistReplacePage(this.page);
  }

  public async clickDeleteActionForValue(
    picklistValueApiName: string
  ): Promise<PicklistReplaceAndDeletePage> {
    const xpath = `//tr[td[2][text() = "${picklistValueApiName}"]]//td[1]//a[contains(@href, "/setup/ui/picklist_masterdelete.jsp") and contains(@href, "deleteType=0")]`;
    await this.page.waitForXPath(xpath);
    const deleteLink = (await this.page.$x(xpath))[0];
    this.page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    await Promise.all([
      this.page.waitForNavigation(),
      this.page.evaluate((e) => e.click(), deleteLink)
    ]);
    await throwPageErrors(this.page);
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
      xpath = `//tr[td[2][text() = "${picklistValueApiName}"]]//td[1]//a[contains(@href, "/setup/ui/picklist_masterdelete.jsp") and contains(@href, "deleteType=1")]`;
    }
    await this.page.waitForXPath(xpath);
    const actionLink = (await this.page.$x(xpath))[0];
    this.page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    await Promise.all([
      this.page.waitForNavigation(),
      this.page.evaluate((e) => e.click(), actionLink)
    ]);
    await throwPageErrors(this.page);
    return this.page;
  }
}

export class DefaultPicklistAddPage {
  protected page;
  protected saveButton = 'input.btn[name="save"]';

  constructor(page: Page) {
    this.page = page;
  }

  async add(newValue: string): Promise<void> {
    const TEXT_AREA = 'textarea';
    if (newValue !== undefined && newValue !== null) {
      await this.page.waitForSelector(TEXT_AREA);
      await this.page.type(TEXT_AREA, newValue);
    }
    await this.save();
  }

  async save(): Promise<void> {
    await pRetry(
      async () => {
        await this.page.waitForSelector(this.saveButton);
        await Promise.all([
          this.page.waitForNavigation(),
          this.page.click(this.saveButton)
        ]);
        await throwPageErrors(this.page);
      },
      {
        onFailedAttempt: error => {
          console.warn(
            `retrying ${error.retriesLeft} more time(s) because of "${error}"`
          );
        },
        retries: process.env.BROWSERFORCE_RETRY_MAX_RETRIES
          ? parseInt(process.env.BROWSERFORCE_RETRY_MAX_RETRIES, 10)
          : 6,
        minTimeout: process.env.BROWSERFORCE_RETRY_TIMEOUT_MS
          ? parseInt(process.env.BROWSERFORCE_RETRY_TIMEOUT_MS, 10)
          : 4000
      }
    );
  }
}

export class StatusPicklistAddPage {
  protected page;
  protected saveButton = 'input.btn[name="save"]';

  constructor(page: Page) {
    this.page = page;
  }

  async add(newValue: string, statusCategory: string): Promise<void> {
    const LABEL_INPUT = 'input#p1';
    const API_NAME_INPUT = 'input#p3';
    const STATUS_CATEGORY_SELECTOR = 'select#p5';
    if (newValue !== undefined && newValue !== null) {
      await this.page.waitForSelector(STATUS_CATEGORY_SELECTOR);
      await this.page.type(LABEL_INPUT, newValue);
      await this.page.type(API_NAME_INPUT, newValue);
      await this.page.type(STATUS_CATEGORY_SELECTOR, statusCategory);
    }
    await this.save();
  }

  async save(): Promise<void> {
    await pRetry(
      async () => {
        await this.page.waitForSelector(this.saveButton);
        await Promise.all([
          this.page.waitForNavigation(),
          this.page.click(this.saveButton)
        ]);
        await throwPageErrors(this.page);
      },
      {
        onFailedAttempt: error => {
          console.warn(
            `retrying ${error.retriesLeft} more time(s) because of "${error}"`
          );
        },
        retries: process.env.BROWSERFORCE_RETRY_MAX_RETRIES
          ? parseInt(process.env.BROWSERFORCE_RETRY_MAX_RETRIES, 10)
          : 6,
        minTimeout: process.env.BROWSERFORCE_RETRY_TIMEOUT_MS
          ? parseInt(process.env.BROWSERFORCE_RETRY_TIMEOUT_MS, 10)
          : 4000
      }
    );
  }
}

export class PicklistReplacePage {
  protected page;
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
      await this.page.waitForSelector(OLD_VALUE_SELECTOR);
      await this.page.type(OLD_VALUE_SELECTOR, value);
    }
    if (replaceAllBlankValues) {
      await this.page.waitForSelector(REPLACE_ALL_BLANK_VALUES_CHECKBOX);
      await this.page.click(REPLACE_ALL_BLANK_VALUES_CHECKBOX);
    }
    if (newValue !== undefined && newValue !== null) {
      await this.page.waitForSelector(NEW_VALUE_SELECTOR);
      await this.page.type(NEW_VALUE_SELECTOR, newValue);
    }
    await this.save();
  }

  async save(): Promise<void> {
    await pRetry(
      async () => {
        await this.page.waitForSelector(this.saveButton);
        await Promise.all([
          this.page.waitForNavigation(),
          this.page.click(this.saveButton)
        ]);
        await throwPageErrors(this.page);
      },
      {
        onFailedAttempt: error => {
          console.warn(
            `retrying ${error.retriesLeft} more time(s) because of "${error}"`
          );
        },
        retries: process.env.BROWSERFORCE_RETRY_MAX_RETRIES
          ? parseInt(process.env.BROWSERFORCE_RETRY_MAX_RETRIES, 10)
          : 6,
        minTimeout: process.env.BROWSERFORCE_RETRY_TIMEOUT_MS
          ? parseInt(process.env.BROWSERFORCE_RETRY_TIMEOUT_MS, 10)
          : 4000
      }
    );
  }
}

export class PicklistReplaceAndDeletePage extends PicklistReplacePage {
  constructor(page: Page) {
    super(page);
    this.saveButton = 'input[name="delID"][type="submit"]';
  }

  async replaceAndDelete(newValue: string): Promise<void> {
    const NEW_VALUE_SELECTOR = 'select#p13';
    const REPLACE_WITH_BLANK_VALUE_RADIO_INPUT =
      'input#ReplaceValueWithNullValue';
    // select option value
    if (newValue !== undefined && newValue !== null) {
      await this.page.waitForSelector(NEW_VALUE_SELECTOR);
      await this.page.type(NEW_VALUE_SELECTOR, newValue);
    } else {
      await this.page.waitForSelector(REPLACE_WITH_BLANK_VALUE_RADIO_INPUT);
      await this.page.click(REPLACE_WITH_BLANK_VALUE_RADIO_INPUT);
    }
    await this.save();
  }
}

async function throwPageErrors(page: Page): Promise<void> {
  const errorHandle = await page.$('div#validationError div.messageText');
  if (errorHandle) {
    const errorMsg = await page.evaluate(
      (div: HTMLDivElement) => div.innerText,
      errorHandle
    );
    await errorHandle.dispose();
    if (errorMsg && errorMsg.trim()) {
      throw new Error(errorMsg.trim());
    }
  }
}
