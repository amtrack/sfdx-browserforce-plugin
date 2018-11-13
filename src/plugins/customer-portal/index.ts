import { ShapePlugin } from '../../plugin';

const PATHS = {
  BASE: '_ui/core/portal/CustomerSuccessPortalSetup/e'
};
const SELECTORS = {
  ENABLED: '#penabled',
  SAVE_BUTTON: 'input[name="save"]',
  ERROR_DIV: '#errorTitle'
};

export default class CustomerPortal extends ShapePlugin {
  public async retrieve() {
    const page = this.browserforce.page;
    await page.goto(`${this.browserforce.getInstanceUrl()}/${PATHS.BASE}`);
    await page.waitFor(SELECTORS.ENABLED);
    const customerPortalNotAvailable = await page.$(SELECTORS.ERROR_DIV);
    if (customerPortalNotAvailable) {
      throw new Error('Customer Portal is not available in this org');
    }
    await page.waitFor(SELECTORS.ENABLED);
    const response = {
      enableCustomerPortal: await page.$eval(
        SELECTORS.ENABLED,
        (el: HTMLInputElement) => el.checked
      )
    };
    return response;
  }

  public async apply(config) {
    if (config.enableCustomerPortal === false) {
      throw new Error('`enableCustomerPortal` cannot be disabled once enabled');
    }
    const page = this.browserforce.page;
    await page.goto(`${this.browserforce.getInstanceUrl()}/${PATHS.BASE}`);
    await page.waitFor(SELECTORS.ENABLED);
    await page.$eval(
      SELECTORS.ENABLED,
      (e: HTMLInputElement, v) => {
        e.checked = v;
      },
      config.enableCustomerPortal
    );
    await Promise.all([
      page.waitForNavigation(),
      page.click(SELECTORS.SAVE_BUTTON)
    ]);
  }
}
