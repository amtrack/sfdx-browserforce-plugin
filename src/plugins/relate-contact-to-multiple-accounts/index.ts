import { Page } from 'puppeteer';
import { retry, throwPageErrors } from '../../browserforce';
import { BrowserforcePlugin } from '../../plugin';

const PATHS = {
  BASE: 'accounts/accountSetup.apexp'
};
const SELECTORS = {
  ENABLED: 'input[id$=":sharedContactsCheckBox"]',
  DISABLED_CHECKBOX: 'input[id$=":sharedContactsCheckBox"][disabled=disabled]',
  EDIT_BUTTON: 'input[id$=":edit"]',
  SAVE_BUTTON: 'input[id$=":save"]',
  DISABLE_CONFIRM_CHECKBOX: 'input#disable_confirm',
  DISABLE_CONFIRM_BUTTON: 'input#sharedContactsDisableConfirmButton',
  ENABLING_IN_PROGRESS: '#enablingInProgress',
  DISABLING_IN_PROGRESS: '#disablingInProgress',
  APPLYING_SETTING_SUCEEDED: '#prefSettingSucceeded'
};

type Config = {
  enabled: boolean;
};

export class RelateContactToMultipleAccounts extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const page = await this.browserforce.openPage(PATHS.BASE);
    await page.waitForSelector(SELECTORS.ENABLED, { visible: true });
    const response = {
      enabled: await page.$eval(SELECTORS.ENABLED, (el: HTMLInputElement) => el.checked)
    };
    await page.close();
    return response;
  }

  public async apply(config: Config): Promise<void> {
    const page = await this.browserforce.openPage(PATHS.BASE);
    await this.waitForProcessFinished(page);
    // First we have to click the 'Edit' button, to make the checkbox editable
    await page.waitForSelector(SELECTORS.EDIT_BUTTON);
    await Promise.all([page.waitForNavigation(), page.click(SELECTORS.EDIT_BUTTON)]);
    // Change the value of the checkbox
    await page.waitForSelector(SELECTORS.ENABLED, { visible: true });
    await page.click(SELECTORS.ENABLED);
    // Save
    if (config.enabled) {
      await page.waitForSelector(SELECTORS.SAVE_BUTTON);
      await Promise.all([page.waitForNavigation(), page.click(SELECTORS.SAVE_BUTTON)]);
    } else {
      await page.waitForSelector(SELECTORS.SAVE_BUTTON);
      await page.click(SELECTORS.SAVE_BUTTON);
      await page.waitForSelector(SELECTORS.DISABLE_CONFIRM_CHECKBOX, { visible: true });
      await page.click(SELECTORS.DISABLE_CONFIRM_CHECKBOX);
      await page.waitForSelector(SELECTORS.DISABLE_CONFIRM_BUTTON);
      await Promise.all([page.waitForNavigation(), page.click(SELECTORS.DISABLE_CONFIRM_BUTTON)]);
    }
    await throwPageErrors(page);
    await page.close();
  }

  async waitForProcessFinished(page: Page): Promise<void> {
    await retry(async () => {
      const enabling = await page.$(SELECTORS.ENABLING_IN_PROGRESS);
      if (enabling) {
        const message = await enabling.evaluate((div: HTMLDivElement) => div.innerText);
        throw new Error(message);
      }
      const disabling = await page.$(SELECTORS.DISABLING_IN_PROGRESS);
      if (disabling) {
        const message = await disabling.evaluate((div: HTMLDivElement) => div.innerText);
        throw new Error(message);
      }
    });
  }
}
