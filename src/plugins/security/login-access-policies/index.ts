import { BrowserforcePlugin } from '../../../plugin.js';

const BASE_PATH = 'partnerbt/loginAccessPolicies.apexp';

const ENABLED_SELECTOR = 'input[id$="adminsCanLogInAsAny"]';
const CONFIRM_MESSAGE_SELECTOR = '.message.confirmM3';
const SAVE_BUTTON_SELECTOR = 'input[id$=":save"]';

export type Config = {
  administratorsCanLogInAsAnyUser: boolean;
};

export class LoginAccessPolicies extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    const page = await this.browserforce.openPage(BASE_PATH);
    await page.waitForSelector(ENABLED_SELECTOR);
    const response = {
      administratorsCanLogInAsAnyUser: await page.$eval(
        ENABLED_SELECTOR,
        (el: HTMLInputElement) => el.checked
      ),
    };
    await page.close();
    return response;
  }

  public async apply(config: Config): Promise<void> {
    const page = await this.browserforce.openPage(BASE_PATH);
    await page.waitForSelector(ENABLED_SELECTOR);
    await page.$eval(
      ENABLED_SELECTOR,
      (e: HTMLInputElement, v: boolean) => {
        e.checked = v;
      },
      config.administratorsCanLogInAsAnyUser
    );
    await Promise.all([
      page.waitForSelector(CONFIRM_MESSAGE_SELECTOR),
      page.click(SAVE_BUTTON_SELECTOR),
    ]);
    await page.close();
  }
}
