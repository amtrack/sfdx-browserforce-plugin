import { BrowserforcePlugin } from '../../../plugin.js';

const EDIT_VIEW = '_ui/core/portal/CustomerSuccessPortalSetup/e';
const SAVE_BUTTON = 'input[name="save"]';
const ENABLE_CHECKBOX = 'input[type="checkbox"][id="penabled"]';

export type Config = boolean | undefined;

export class CustomerPortalEnable extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    const conn = await this.browserforce.org.getConnection();
    const orgSettings = await conn.metadata.read('OrgSettings', 'Org');
    return orgSettings.enableCustomerSuccessPortal ?? false;
  }

  public async apply(plan: Config): Promise<void> {
    if (plan === false) {
      throw new Error('`enabled` cannot be disabled once enabled');
    }
    const page = await this.browserforce.openPage(EDIT_VIEW);
    await page
      .locator(ENABLE_CHECKBOX)
      .map((checkbox) => (checkbox.checked = true))
      .wait();
    await Promise.all([
      page.waitForNavigation(),
      page.locator(SAVE_BUTTON).click(),
    ]);
    await page.close();
  }
}
