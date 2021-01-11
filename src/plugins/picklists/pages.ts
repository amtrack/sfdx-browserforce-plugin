import pRetry = require('p-retry');
import { JSHandle } from 'puppeteer';

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

  constructor(page) {
    this.page = page;
  }

  public async getPicklistValues(): Promise<Array<PicklistValue>> {
    // wait for New button in any related list
    await this.page.waitForSelector('body table input[name="new"]');
    const resolvePicklistValueNames = async xpath => {
      const fullNameHandles = await this.page.$x(xpath);
      const innerTextJsHandles = await Promise.all<JSHandle>(
        fullNameHandles.map(handle => handle.getProperty('innerText'))
      );
      const fullNames = await Promise.all<any>(
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

  public async clickReplaceActionButton(): Promise<any> {
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
  ): Promise<any> {
    const xpath = `//tr[td[2][text() = "${picklistValueApiName}"]]//td[1]//a[contains(@href, "/setup/ui/picklist_masterdelete.jsp") and contains(@href, "deleteType=0")]`;
    await this.page.waitForXPath(xpath);
    const actionLinkHandles = await this.page.$x(xpath);
    if (actionLinkHandles.length !== 1) {
      throw new Error(
        `Could not find delete action for picklist value: ${picklistValueApiName}`
      );
    }
    this.page.on('dialog', async dialog => {
      await dialog.accept();
    });
    await Promise.all([
      this.page.waitForNavigation(),
      actionLinkHandles[0].click()
    ]);
    return new PicklistReplaceAndDeletePage(this.page);
  }

  public async clickActivateDeactivateActionForValue(
    picklistValueApiName: string,
    active: boolean
  ): Promise<any> {
    let xpath;
    let actionName;
    if (active) {
      xpath = `//tr[td[2][text() = "${picklistValueApiName}"]]//td[1]//a[contains(@href, "/setup/ui/picklist_masteractivate.jsp")]`;
      actionName = 'activate';
    } else {
      xpath = `//tr[td[2][text() = "${picklistValueApiName}"]]//td[1]//a[contains(@href, "/setup/ui/picklist_masterdelete.jsp") and contains(@href, "deleteType=1")]`;
      actionName = 'deactivate';
    }
    await this.page.waitForXPath(xpath);
    const actionLinkHandles = await this.page.$x(xpath);
    if (actionLinkHandles.length !== 1) {
      throw new Error(
        `Could not find ${actionName} action for picklist value: ${picklistValueApiName}`
      );
    }
    this.page.on('dialog', async dialog => {
      await dialog.accept();
    });
    await Promise.all([
      this.page.waitForNavigation(),
      actionLinkHandles[0].click()
    ]);
    return this.page;
  }
}

export class PicklistReplacePage {
  protected page;
  protected saveButton = 'input[name="save"]';

  constructor(page) {
    this.page = page;
  }

  async replace(value, newValue, replaceAllBlankValues?) {
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

  async save() {
    await pRetry(
      async () => {
        await this.page.waitForSelector(this.saveButton);
        await Promise.all([
          this.page.waitForNavigation(),
          this.page.click(this.saveButton)
        ]);
        await this.throwPageErrors();
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

  async throwPageErrors() {
    const errorHandle = await this.page.$(
      'div#validationError div.messageText'
    );
    if (errorHandle) {
      const errorMsg = await this.page.evaluate(
        (div: HTMLDivElement) => div.innerText,
        errorHandle
      );
      await errorHandle.dispose();
      if (errorMsg && errorMsg.trim()) {
        throw new Error(errorMsg.trim());
      }
    }
  }
}

export class PicklistReplaceAndDeletePage extends PicklistReplacePage {
  constructor(page) {
    super(page);
    this.saveButton = 'input[name="delID"][type="submit"]';
  }

  async replaceAndDelete(newValue) {
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
