import { BrowserforcePlugin } from '../../../plugin.js';

const BASE_PATH = '_ui/core/portal/CustomerSuccessPortalSetup/e';

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
    const page = await this.browserforce.openPage(BASE_PATH);
    await page.locator(ENABLE_CHECKBOX).setChecked(true);
    await page.locator(SAVE_BUTTON).first().click();
    await Promise.race([
      page.waitForURL((url) => url.pathname !== `${BASE_PATH}`),
      this.browserforce.waitForPageErrors(page),
    ]);
    await page.close();
  }
}
