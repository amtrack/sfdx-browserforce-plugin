import { BrowserforcePlugin } from '../../plugin.js';

const PATHS = {
  BASE: '_ui/networks/setup/NetworkSettingsPage',
};
const SELECTORS = {
  BASE: 'div.pbBody',
  ENABLE_CHECKBOX: 'input[id$=":enableNetworkPrefId"]',
  DOMAIN_NAME_INPUT_TEXT: 'input[id$=":inputSubdomain"]',
  SAVE_BUTTON: 'input[id$=":saveId"]',
};

type Config = {
  enabled?: boolean;
  domainName?: string;
};

export class Communities extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    const page = await this.browserforce.openPage(PATHS.BASE);
    const frameOrPage = await this.browserforce.waitForSelectorInFrameOrPage(
      page,
      SELECTORS.BASE
    );
    const response = {
      enabled: true,
    };
    const inputEnable = await frameOrPage.$(SELECTORS.ENABLE_CHECKBOX);
    if (inputEnable) {
      response.enabled = await frameOrPage.$eval(
        SELECTORS.ENABLE_CHECKBOX,
        (el: HTMLInputElement) => el.checked
      );
    }
    await page.close();
    return response;
  }

  public async apply(config: Config): Promise<void> {
    if (config.enabled === false) {
      throw new Error('`enabled` cannot be disabled once enabled');
    }

    const page = await this.browserforce.openPage(PATHS.BASE);
    const frameOrPage = await this.browserforce.waitForSelectorInFrameOrPage(
      page,
      SELECTORS.ENABLE_CHECKBOX
    );
    await frameOrPage.click(SELECTORS.ENABLE_CHECKBOX);
    const domainName = (
      config.domainName ||
      this.browserforce.getMyDomain() ||
      `comm-${Math.random().toString(36).substr(2)}`
    ).substring(0, 22);
    await frameOrPage.waitForSelector(SELECTORS.DOMAIN_NAME_INPUT_TEXT);
    await frameOrPage.type(SELECTORS.DOMAIN_NAME_INPUT_TEXT, domainName);
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    await frameOrPage.waitForSelector(SELECTORS.SAVE_BUTTON);
    await Promise.all([
      page.waitForNavigation(),
      frameOrPage.click(SELECTORS.SAVE_BUTTON),
    ]);
    await page.close();
  }
}
