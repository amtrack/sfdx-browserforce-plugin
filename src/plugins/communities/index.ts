import { BrowserforcePlugin } from '../../plugin.js';

const BASE_PATH = '_ui/networks/setup/NetworkSettingsPage';

const BASE_SELECTOR = 'div.pbBody';
const ENABLE_CHECKBOX_SELECTOR = 'input[id$=":enableNetworkPrefId"]';
const DOMAIN_NAME_INPUT_TEXT_SELECTOR = 'input[id$=":inputSubdomain"]';
const SAVE_BUTTON_SELECTOR = 'input[id$=":saveId"]';

type Config = {
  enabled?: boolean;
  domainName?: string;
};

export class Communities extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    const page = await this.browserforce.openPage(BASE_PATH);
    const frameOrPage = await this.browserforce.waitForSelectorInFrameOrPage(
      page,
      BASE_SELECTOR
    );
    const response = {
      enabled: true,
    };
    const inputEnable = await frameOrPage.$(ENABLE_CHECKBOX_SELECTOR);
    if (inputEnable) {
      response.enabled = await frameOrPage.$eval(
        ENABLE_CHECKBOX_SELECTOR,
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

    const page = await this.browserforce.openPage(BASE_PATH);
    const frameOrPage = await this.browserforce.waitForSelectorInFrameOrPage(
      page,
      ENABLE_CHECKBOX_SELECTOR
    );
    await frameOrPage.click(ENABLE_CHECKBOX_SELECTOR);
    const domainName = (
      config.domainName ||
      this.browserforce.getMyDomain() ||
      `comm-${Math.random().toString(36).substr(2)}`
    ).substring(0, 22);
    await frameOrPage.waitForSelector(DOMAIN_NAME_INPUT_TEXT_SELECTOR);
    await frameOrPage.type(DOMAIN_NAME_INPUT_TEXT_SELECTOR, domainName);
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    await frameOrPage.waitForSelector(SAVE_BUTTON_SELECTOR);
    await Promise.all([
      page.waitForNavigation(),
      frameOrPage.click(SAVE_BUTTON_SELECTOR),
    ]);
    await page.close();
  }
}
