import { BrowserforcePlugin } from '../../plugin';

const PATHS = {
  BASE: '_ui/networks/setup/NetworkSettingsPage'
};
const SELECTORS = {
  BASE: 'div.pbBody',
  ENABLE_CHECKBOX: 'input[id$=":enableNetworkPrefId"]',
  SAVE_BUTTON: 'input[id$=":saveId"]'
};

type Config = {
  enabled?: boolean;
};

export class Communities extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    const page = await this.browserforce.openPage(PATHS.BASE);
    const frameOrPage = await this.browserforce.waitForSelectorInFrameOrPage(
      page,
      SELECTORS.BASE
    );
    const response = {
      enabled: true
    };
    const inputEnable = await frameOrPage.$(SELECTORS.ENABLE_CHECKBOX);
    if (inputEnable) {
      response.enabled = await frameOrPage.$eval(
        SELECTORS.ENABLE_CHECKBOX,
        (el: HTMLInputElement) => el.checked
      );
    }
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
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    await frameOrPage.waitForSelector(SELECTORS.SAVE_BUTTON);
    await Promise.all([
      frameOrPage.click(SELECTORS.SAVE_BUTTON),
      page.waitForNavigation()
    ]);
  }
}
