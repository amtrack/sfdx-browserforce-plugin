import { ShapePlugin } from '../../plugin';

export default class CustomerPortal extends ShapePlugin {
  public static schema = require('./schema.json');
  protected static SELECTORS = {
    ENABLED: '#penabled',
    SAVE_BUTTON: 'input[name="save"]',
    ERROR_DIV: '#errorTitle'
  };
  protected static PATHS = {
    BASE: '/_ui/core/portal/CustomerSuccessPortalSetup/e'
  };

  public async retrieve() {
    const page = this.browserforce.page;
    await page.goto(this.getBaseUrl());
    await page.waitFor(this.constructor['SELECTORS'].ENABLED);
    const customerPortalNotAvailable = await page.$(
      this.constructor['SELECTORS'].ERROR_DIV
    );
    if (customerPortalNotAvailable) {
      throw new Error(
        `${this.constructor['schema'].title} is not available in this org`
      );
    }
    await page.waitFor(this.constructor['SELECTORS'].ENABLED);
    const response = {
      enableCustomerPortal: await page.$eval(
        this.constructor['SELECTORS'].ENABLED,
        (el: HTMLInputElement) => el.checked
      )
    };
    return response;
  }

  public async apply(config) {
    if (config.enableCustomerPortal === false) {
      throw new Error(
        '`enableCustomerPortal` cannot be disabled once enabled'
      );
    }
    const page = this.browserforce.page;
    await page.goto(this.getBaseUrl());
    await page.waitFor(this.constructor['SELECTORS'].ENABLED);
    await page.$eval(
      this.constructor['SELECTORS'].ENABLED,
      (e: HTMLInputElement, v) => {
        e.checked = v;
      },
      config.enableCustomerPortal
    );
    await Promise.all([
      page.waitForNavigation(),
      page.click(this.constructor['SELECTORS'].SAVE_BUTTON)
    ]);
  }
}
