import { BrowserforcePlugin } from '../../../plugin.js';
import { setCheckboxMapFn } from '../../../puppeteer.js';

const BASE_PATH = 'partnerbt/loginAccessPolicies.apexp';

const ENABLED_CHECKBOX = 'input[type="checkbox"][id$="adminsCanLogInAsAny"]';
const CONFIRM_MESSAGE = '.message.confirmM3';
const SAVE_BUTTON = 'input[id$=":save"]';

export type Config = {
  administratorsCanLogInAsAnyUser: boolean;
};

export class LoginAccessPolicies extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    const page = await this.browserforce.openPage(BASE_PATH);
    const response = {
      administratorsCanLogInAsAnyUser: await page
        .locator(ENABLED_CHECKBOX)
        .map((input) => input.checked)
        .wait(),
    };
    await page.close();
    return response;
  }

  public async apply(config: Config): Promise<void> {
    const page = await this.browserforce.openPage(BASE_PATH);
    await page
      .locator(ENABLED_CHECKBOX)
      .map(setCheckboxMapFn(config.administratorsCanLogInAsAnyUser))
      .wait();
    await Promise.all([
      page.locator(CONFIRM_MESSAGE).wait(),
      page.locator(SAVE_BUTTON).click(),
    ]);
    await page.close();
  }
}
