import { Page } from 'puppeteer';
import { retry, throwPageErrors } from '../../browserforce.js';
import { BrowserforcePlugin } from '../../plugin.js';

const BASE_PATH = 'accounts/accountSetup.apexp';

const ENABLED_SELECTOR = 'input[id$=":sharedContactsCheckBox"]';
const EDIT_BUTTON_SELECTOR = 'input[id$=":edit"]';
const SAVE_BUTTON_SELECTOR = 'input[id$=":save"]';
const DISABLE_CONFIRM_CHECKBOX_SELECTOR = 'input#disable_confirm';
const DISABLE_CONFIRM_BUTTON_SELECTOR =
  'input#sharedContactsDisableConfirmButton';
const ENABLING_IN_PROGRESS_SELECTOR = '#enablingInProgress';
const DISABLING_IN_PROGRESS_SELECTOR = '#disablingInProgress';

type Config = {
  enabled: boolean;
};

export class RelateContactToMultipleAccounts extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const page = await this.browserforce.openPage(BASE_PATH);
    await page.waitForSelector(ENABLED_SELECTOR, { visible: true });
    const response = {
      enabled: await page.$eval(
        ENABLED_SELECTOR,
        (el: HTMLInputElement) => el.checked
      ),
    };
    await page.close();
    return response;
  }

  public async apply(config: Config): Promise<void> {
    const page = await this.browserforce.openPage(BASE_PATH);
    await this.waitForProcessFinished(page);
    // First we have to click the 'Edit' button, to make the checkbox editable
    await page.waitForSelector(EDIT_BUTTON_SELECTOR);
    await Promise.all([
      page.waitForNavigation(),
      page.click(EDIT_BUTTON_SELECTOR),
    ]);
    // Change the value of the checkbox
    await page.waitForSelector(ENABLED_SELECTOR, { visible: true });
    await page.click(ENABLED_SELECTOR);
    // Save
    if (config.enabled) {
      await page.waitForSelector(SAVE_BUTTON_SELECTOR);
      await Promise.all([
        page.waitForNavigation(),
        page.click(SAVE_BUTTON_SELECTOR),
      ]);
    } else {
      await page.waitForSelector(SAVE_BUTTON_SELECTOR);
      await page.click(SAVE_BUTTON_SELECTOR);
      await page.waitForSelector(DISABLE_CONFIRM_CHECKBOX_SELECTOR, {
        visible: true,
      });
      await page.click(DISABLE_CONFIRM_CHECKBOX_SELECTOR);
      await page.waitForSelector(DISABLE_CONFIRM_BUTTON_SELECTOR);
      await Promise.all([
        page.waitForNavigation(),
        page.click(DISABLE_CONFIRM_BUTTON_SELECTOR),
      ]);
    }
    await throwPageErrors(page);
    await page.close();
  }

  async waitForProcessFinished(page: Page): Promise<void> {
    await retry(async () => {
      const enabling = await page.$(ENABLING_IN_PROGRESS_SELECTOR);
      if (enabling) {
        const message = await enabling.evaluate(
          (div: HTMLDivElement) => div.innerText
        );
        throw new Error(message);
      }
      const disabling = await page.$(DISABLING_IN_PROGRESS_SELECTOR);
      if (disabling) {
        const message = await disabling.evaluate(
          (div: HTMLDivElement) => div.innerText
        );
        throw new Error(message);
      }
    });
  }
}
