import { ShapePlugin } from '../../plugin';

export default class AdminsCanLogInAsAny extends ShapePlugin {
  public static schema = {
    name: 'AdminsCanLogInAsAny',
    description:
      'Login Access Policies -> Administrators Can Log in as Any User',
    properties: {
      enabled: {
        name: 'enabled',
        label: 'Enabled',
        selector: 'input[id$="adminsCanLogInAsAny"]'
      }
    }
  };
  protected static SELECTORS = {
    CONFIRM_MESSAGE: '.message.confirmM3',
    SAVE_BUTTON: 'input[id$=":save"]'
  };
  protected static PATHS = {
    BASE: '/partnerbt/loginAccessPolicies.apexp'
  };

  public async retrieve() {
    const page = await this.getPage();
    await page.goto(this.getBaseUrl());
    await page.waitFor(this.constructor['schema'].properties.enabled.selector);
    const response = {};
    response[
      this.constructor['schema'].properties.enabled.name
    ] = await page.$eval(
      this.constructor['schema'].properties.enabled.selector,
      (el: HTMLInputElement) => el.checked
    );
    await page.close();
    return response;
  }

  public async apply(actions) {
    if (!actions || !actions.length) {
      return;
    }
    const action = actions[0];
    const page = await this.getPage();
    await page.goto(this.getBaseUrl());
    await page.waitFor(this.constructor['schema'].properties.enabled.selector);
    await page.evaluate(
      data => {
        const checkbox = document.querySelector(data.action.selector);
        checkbox.checked = data.action.targetValue;
      },
      {
        action
      }
    );
    await Promise.all([
      page.waitFor(this.constructor['SELECTORS'].CONFIRM_MESSAGE),
      page.click(this.constructor['SELECTORS'].SAVE_BUTTON)
    ]);
    await page.close();
  }
}
