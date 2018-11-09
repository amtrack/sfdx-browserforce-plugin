import { ShapePlugin } from '../../plugin';

export default class LoginAccessPolicies extends ShapePlugin {
  protected static SELECTORS = {
    ENABLED: 'input[id$="adminsCanLogInAsAny"]',
    CONFIRM_MESSAGE: '.message.confirmM3',
    SAVE_BUTTON: 'input[id$=":save"]'
  };
  protected static PATHS = {
    BASE: '/partnerbt/loginAccessPolicies.apexp'
  };

  public async retrieve() {
    const page = this.browserforce.page;
    await page.goto(this.getBaseUrl());
    await page.waitFor(this.constructor['SELECTORS'].ENABLED);
    const response = {
      administratorsCanLogInAsAnyUser: await page.$eval(
        this.constructor['SELECTORS'].ENABLED,
        (el: HTMLInputElement) => el.checked
      )
    };
    return response;
  }

  public async apply(config) {
    const page = this.browserforce.page;
    await page.goto(this.getBaseUrl());
    await page.waitFor(this.constructor['SELECTORS'].ENABLED);
    await page.$eval(
      this.constructor['SELECTORS'].ENABLED,
      (e: HTMLInputElement, v) => {
        e.checked = v;
      },
      config.administratorsCanLogInAsAnyUser
    );
    await Promise.all([
      page.waitFor(this.constructor['SELECTORS'].CONFIRM_MESSAGE),
      page.click(this.constructor['SELECTORS'].SAVE_BUTTON)
    ]);
  }
}
