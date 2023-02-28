import { BrowserforcePlugin } from '../../plugin';

const PATHS = {
  BASE: '_ui/networks/setup/NetworkSettingsPage'
};
const SELECTORS = {
  BASE: 'div.pbBody',
  ENABLE_CHECKBOX: 'input[id="pEnableExperienceBundleMetadata"]',
  SAVE_BUTTON: 'input[name="save"]'
};

type Config = {
  enabled?: boolean;
};

export class ExperienceBundleApi extends BrowserforcePlugin {
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
    await Promise.all([
      page.waitForNavigation(),
      frameOrPage.click(SELECTORS.SAVE_BUTTON)
    ]);
  }
}
