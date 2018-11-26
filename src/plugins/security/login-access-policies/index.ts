import { BrowserforcePlugin } from '../../../plugin';

const PATHS = {
  BASE: 'partnerbt/loginAccessPolicies.apexp'
};
const SELECTORS = {
  ENABLED: 'input[id$="adminsCanLogInAsAny"]',
  CONFIRM_MESSAGE: '.message.confirmM3',
  SAVE_BUTTON: 'input[id$=":save"]'
};

export default class LoginAccessPolicies extends BrowserforcePlugin {
  public async retrieve(definition?) {
    const page = this.browserforce.page;
    await page.goto(`${this.browserforce.getInstanceUrl()}/${PATHS.BASE}`);
    await page.waitFor(SELECTORS.ENABLED);
    const response = {
      administratorsCanLogInAsAnyUser: await page.$eval(
        SELECTORS.ENABLED,
        (el: HTMLInputElement) => el.checked
      )
    };
    return response;
  }

  public async apply(config) {
    const page = this.browserforce.page;
    await page.goto(`${this.browserforce.getInstanceUrl()}/${PATHS.BASE}`);
    await page.waitFor(SELECTORS.ENABLED);
    await page.$eval(
      SELECTORS.ENABLED,
      (e: HTMLInputElement, v) => {
        e.checked = v;
      },
      config.administratorsCanLogInAsAnyUser
    );
    await Promise.all([
      page.waitFor(SELECTORS.CONFIRM_MESSAGE),
      page.click(SELECTORS.SAVE_BUTTON)
    ]);
  }
}
