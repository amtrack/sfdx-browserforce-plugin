import { BrowserforcePlugin } from '../../../plugin';

const PATHS = {
  EDIT_VIEW: '_ui/core/portal/CustomerSuccessPortalSetup/e'
};
const SELECTORS = {
  ENABLED: '#penabled',
  SAVE_BUTTON: 'input[name="save"]'
};

export default class CustomerPortalEnable extends BrowserforcePlugin {
  public async retrieve(definition?) {

    const page = await this.browserforce.openPage(PATHS.EDIT_VIEW, { waitUntil: ['load', 'domcontentloaded', 'networkidle0'] });
    await page.waitFor(SELECTORS.ENABLED);
    const response = await page.$eval(
      SELECTORS.ENABLED,
      (el: HTMLInputElement) => el.checked
    );
    return response;
  }

  public diff(state, definition) {
    if (state !== definition) {
      return definition;
    }
  }

  public async apply(plan) {
    if (plan === false) {
      throw new Error('`enabled` cannot be disabled once enabled');
    }

    if (plan) {
      const page = await this.browserforce.openPage(PATHS.EDIT_VIEW);
      await page.waitFor(SELECTORS.ENABLED);
      await page.$eval(
        SELECTORS.ENABLED,
        (e: HTMLInputElement, v) => {
          e.checked = v;
        },
        plan
      );
      await Promise.all([
        page.waitForNavigation(),
        page.click(SELECTORS.SAVE_BUTTON)
      ]);
    }
  }
}
