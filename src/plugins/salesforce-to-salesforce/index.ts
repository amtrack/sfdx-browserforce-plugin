import { ShapePlugin } from '../../plugin';

export default class SalesforceToSalesforce extends ShapePlugin {
  public static schema = {
    name: 'SalesforceToSalesforce',
    description: 'Salesforce to Salesforce',
    properties: {
      enabled: {
        name: 'enabled',
        label: 'Enabled',
        selector: '#penabled'
      }
    }
  };
  protected static SELECTORS = {
    BASE: 'table.detailList',
    SAVE_BUTTON: 'input[name="save"]'
  };
  protected static PATHS = {
    BASE: '/_ui/s2s/ui/PartnerNetworkEnable/e'
  };

  public async retrieve() {
    const page = await this.getPage();
    await page.goto(this.getBaseUrl());
    await page.waitFor(this.constructor['SELECTORS'].BASE);
    const inputEnable = await page.$(
      this.constructor['schema'].properties.enabled.selector
    );
    const response = {};
    if (inputEnable) {
      response[
        this.constructor['schema'].properties.enabled.name
      ] = await page.$eval(
        this.constructor['schema'].properties.enabled.selector,
        (el: HTMLInputElement) => el.checked
      );
    } else {
      // already enabled
      response[this.constructor['schema'].properties.enabled.name] = true;
    }
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
