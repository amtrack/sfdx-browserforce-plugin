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
    const conn = await this.browserforce.org.getConnection();
    const orgSettings = await conn.metadata.readSync('OrgSettings', 'Org');
    return Boolean(orgSettings['enableCustomerSuccessPortal']);
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
      await page.waitForSelector(SELECTORS.ENABLED);
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
