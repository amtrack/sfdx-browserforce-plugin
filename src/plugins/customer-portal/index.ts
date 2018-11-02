import { ShapePlugin } from '../../plugin';

export default class CustomerPortal extends ShapePlugin {
  public static schema = {
    name: 'CustomerPortal',
    description: 'Customer Portal',
    properties: {
      enabled: {
        name: 'enabled',
        label: 'Enabled',
        selector: '#penabled'
      }
    }
  };
  protected static SELECTORS = {
    SAVE_BUTTON: 'input[name="save"]',
    ERROR_DIV: '#errorTitle'
  };
  protected static PATHS = {
    BASE: '/_ui/core/portal/CustomerSuccessPortalSetup/e'
  };

  public async retrieve() {
    const page = await this.getPage();
    await page.goto(this.getBaseUrl());
    await page.waitFor(this.constructor['schema'].properties.enabled.selector);
    const customerPortalNotAvailable = await page.$(
      this.constructor['SELECTORS'].ERROR_DIV
    );
    if (customerPortalNotAvailable) {
      await page.close();
      throw new Error(
        `${this.constructor['schema'].name} is not available in this org`
      );
    }
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
    if (action.name === 'enabled' && action.targetValue === false) {
      throw new Error(
        `${this.constructor['schema'].name} cannot be disabled once enabled`
      );
    }
    const page = await this.getPage();
    await page.goto(this.getBaseUrl());
    await page.waitFor(this.constructor['schema'].properties.enabled.selector);
    await page.$eval(
      action.selector,
      (e: HTMLInputElement, v) => {
        e.checked = v;
      },
      action.targetValue
    );
    await Promise.all([
      page.waitForNavigation(),
      page.click(this.constructor['SELECTORS'].SAVE_BUTTON)
    ]);
    await page.close();
  }
}
