import { BrowserforcePlugin } from '../../../plugin.js';

const BASE_PATH = 'ui/rpt/AnalyticsSharingSettingsPage/e';

const BASE_SELECTOR = 'div.pbBody';
const ENABLE_CHECKBOX_SELECTOR = 'input[id="0"]';
const SAVE_BUTTON_SELECTOR = 'input[id="saveButton"]';

export type Config = {
  enableEnhancedFolderSharing: boolean;
};

export class FolderSharing extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const response = {
      enableEnhancedFolderSharing: true,
    };
    await using page = await this.browserforce.openPage(BASE_PATH);

    try {
      const frameOrPage = await this.browserforce.waitForSelectorInFrameOrPage(
        page,
        BASE_SELECTOR
      );
      const inputEnable = await frameOrPage
        .locator(ENABLE_CHECKBOX_SELECTOR)
        .count();
      if (inputEnable > 0) {
        response.enableEnhancedFolderSharing = await frameOrPage
          .locator(ENABLE_CHECKBOX_SELECTOR)
          .isChecked();
      } else {
        // already enabled
        response.enableEnhancedFolderSharing = true;
      }
    } catch (e) {
      if (e instanceof Error && e.message.match('Insufficient Privileges')) {
        return response;
      }
      throw e;
    }
    return response;
  }

  public async apply(config: Config): Promise<void> {
    if (config.enableEnhancedFolderSharing === false) {
      throw new Error(
        '`enableEnhancedFolderSharing` cannot be disabled once enabled'
      );
    }
    await using page = await this.browserforce.openPage(BASE_PATH);
    await page
      .locator(ENABLE_CHECKBOX_SELECTOR)
      .setChecked(config.enableEnhancedFolderSharing);
    await Promise.all([
      page.waitForEvent('load'),
      page.locator(SAVE_BUTTON_SELECTOR).click(),
    ]);
  }
}
