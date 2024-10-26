import { BrowserforcePlugin } from '../../../plugin.js';

const PATHS = {
  EDIT_VIEW: '_ui/core/portal/CustomerSuccessPortalSetup/e'
};
const SELECTORS = {
  ENABLED: '#penabled',
  SAVE_BUTTON: 'input[name="save"]'
};

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

    if (plan) {
      const page = await this.browserforce.openPage(PATHS.EDIT_VIEW);
      await page.waitForSelector(SELECTORS.ENABLED);
      await page.$eval(
        SELECTORS.ENABLED,
        (e: HTMLInputElement, v: boolean) => {
          e.checked = v;
        },
        plan
      );
      await Promise.all([page.waitForNavigation(), page.click(SELECTORS.SAVE_BUTTON)]);
      await page.close();
    }
  }
}
