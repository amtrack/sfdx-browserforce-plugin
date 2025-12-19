import { Page } from 'puppeteer';
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
    let page: Page;
    try {
      page = await this.browserforce.openPage(BASE_PATH);
      const frameOrPage = await this.browserforce.waitForSelectorInFrameOrPage(page, BASE_SELECTOR);
      const inputEnable = await frameOrPage.$(ENABLE_CHECKBOX_SELECTOR);
      if (inputEnable) {
        response.enableEnhancedFolderSharing = await frameOrPage.$eval(
          ENABLE_CHECKBOX_SELECTOR,
          (el: HTMLInputElement) => el.checked,
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
      throw new Error('`enableEnhancedFolderSharing` cannot be disabled once enabled');
    }
    const page = await this.browserforce.openPage(BASE_PATH);
    await page.waitForSelector(ENABLE_CHECKBOX_SELECTOR);
    await page.$eval(
      ENABLE_CHECKBOX_SELECTOR,
      (e: HTMLInputElement, v: boolean) => {
        e.checked = v;
      },
      config.enableEnhancedFolderSharing,
    );
    await page.waitForSelector(SAVE_BUTTON_SELECTOR);
    await Promise.all([page.waitForNavigation(), page.click(SAVE_BUTTON_SELECTOR)]);
    await page.close();
  }
}
