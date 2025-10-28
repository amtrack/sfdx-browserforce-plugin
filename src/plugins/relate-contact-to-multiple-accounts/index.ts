import { Page } from 'playwright';
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
    await page.locator(ENABLED_SELECTOR).waitFor({ state: 'visible' });
    const response = {
      enabled: await page.locator(ENABLED_SELECTOR).isChecked(),
    };
    await page.close();
    return response;
  }

  public async apply(config: Config): Promise<void> {
    const page = await this.browserforce.openPage(BASE_PATH);
    await this.waitForProcessFinished(page);
    // First we have to click the 'Edit' button, to make the checkbox editable
    await page.locator(EDIT_BUTTON_SELECTOR).waitFor();
    await Promise.all([
      page.waitForLoadState('load'),
      page.locator(EDIT_BUTTON_SELECTOR).click(),
    ]);
    // Change the value of the checkbox
    await page.locator(ENABLED_SELECTOR).waitFor({ state: 'visible' });
    await page.locator(ENABLED_SELECTOR).click();
    // Save
    if (config.enabled) {
      await page.locator(SAVE_BUTTON_SELECTOR).waitFor();
      await Promise.all([
        page.waitForLoadState('load'),
        page.locator(SAVE_BUTTON_SELECTOR).click(),
      ]);
    } else {
      await page.locator(SAVE_BUTTON_SELECTOR).waitFor();
      await page.locator(SAVE_BUTTON_SELECTOR).click();
      await page.locator(DISABLE_CONFIRM_CHECKBOX_SELECTOR).waitFor({ state: 'visible' });
      await page.locator(DISABLE_CONFIRM_CHECKBOX_SELECTOR).click();
      await page.locator(DISABLE_CONFIRM_BUTTON_SELECTOR).waitFor();
      await Promise.all([
        page.waitForLoadState('load'),
        page.locator(DISABLE_CONFIRM_BUTTON_SELECTOR).click(),
      ]);
    }
    await throwPageErrors(page);
    await page.close();
  }

  async waitForProcessFinished(page: Page): Promise<void> {
    await retry(async () => {
      const enablingCount = await page.locator(ENABLING_IN_PROGRESS_SELECTOR).count();
      if (enablingCount > 0) {
        const message = await page.locator(ENABLING_IN_PROGRESS_SELECTOR).innerText();
        throw new Error(message);
      }
      const disablingCount = await page.locator(DISABLING_IN_PROGRESS_SELECTOR).count();
      if (disablingCount > 0) {
        const message = await page.locator(DISABLING_IN_PROGRESS_SELECTOR).innerText();
        throw new Error(message);
      }
    });
  }
}
