import { BrowserforcePlugin } from '../../../plugin.js';

const PATHS = {
  BASE: 'partnerbt/loginAccessPolicies.apexp'
};
const SELECTORS = {
  ENABLED: 'input[id$="adminsCanLogInAsAny"]',
  CONFIRM_MESSAGE: '.message.confirmM3',
  SAVE_BUTTON: 'input[id$=":save"]'
};

export type Config = {
  administratorsCanLogInAsAnyUser: boolean;
};

export class LoginAccessPolicies extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    const page = await this.browserforce.openPage(PATHS.BASE);
    await page.waitForSelector(SELECTORS.ENABLED);
    const response = {
      administratorsCanLogInAsAnyUser: await page.$eval(SELECTORS.ENABLED, (el: HTMLInputElement) => el.checked)
    };
    await page.close();
    return response;
  }

  public async apply(config: Config): Promise<void> {
    const page = await this.browserforce.openPage(PATHS.BASE);
    await page.waitForSelector(SELECTORS.ENABLED);
    await page.$eval(
      SELECTORS.ENABLED,
      (e: HTMLInputElement, v: boolean) => {
        e.checked = v;
      },
      config.administratorsCanLogInAsAnyUser
    );
    await Promise.all([page.waitForSelector(SELECTORS.CONFIRM_MESSAGE), page.click(SELECTORS.SAVE_BUTTON)]);
    await page.close();
  }
}
