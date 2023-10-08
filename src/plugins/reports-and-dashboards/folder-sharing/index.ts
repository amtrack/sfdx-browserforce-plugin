import { Page } from 'puppeteer';
import { BrowserforcePlugin } from '../../../plugin';

const PATHS = {
  BASE: 'ui/rpt/AnalyticsSharingSettingsPage/e'
};
const SELECTORS = {
  BASE: 'div.pbBody',
  ENABLE_CHECKBOX: 'input[id="0"]',
  SAVE_BUTTON: 'input[id="saveButton"]'
};

export type Config = {
  enableEnhancedFolderSharing: boolean;
};

export class FolderSharing extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const response = {
      enableEnhancedFolderSharing: true
    };
    let page: Page;
    try {
      page = await this.browserforce.openPage(PATHS.BASE);
      const frameOrPage = await this.browserforce.waitForSelectorInFrameOrPage(
        page,
        SELECTORS.BASE
      );
      const inputEnable = await frameOrPage.$(SELECTORS.ENABLE_CHECKBOX);
      if (inputEnable) {
        response.enableEnhancedFolderSharing = await frameOrPage.$eval(
          SELECTORS.ENABLE_CHECKBOX,
          (el: HTMLInputElement) => el.checked
        );
      } else {
        // already enabled
        response.enableEnhancedFolderSharing = true;
      }
    } catch (e) {
      if (e.message.match('Insufficient Privileges')) {
        return response;
      }
      throw e;
    }
    await page.close();
    return response;
  }

  public async apply(config: Config): Promise<void> {
    if (config.enableEnhancedFolderSharing === false) {
      throw new Error(
        '`enableEnhancedFolderSharing` cannot be disabled once enabled'
      );
    }
    const page = await this.browserforce.openPage(PATHS.BASE);
    await page.waitForSelector(SELECTORS.ENABLE_CHECKBOX);
    await page.$eval(
      SELECTORS.ENABLE_CHECKBOX,
      (e: HTMLInputElement, v: boolean) => {
        e.checked = v;
      },
      config.enableEnhancedFolderSharing
    );
    await page.waitForSelector(SELECTORS.SAVE_BUTTON);
    await Promise.all([
      page.waitForNavigation(),
      page.click(SELECTORS.SAVE_BUTTON)
    ]);
    await page.close();
  }
}
