import { BrowserforcePlugin } from '../../../plugin';

const PATHS = {
  BASE: 'ui/rpt/AnalyticsSharingSettingsPage/e'
};
const SELECTORS = {
  BASE: 'div.pbBody',
  ENABLE_CHECKBOX: 'input[id="0"]',
  SAVE_BUTTON: 'input[id="saveButton"]'
};

export default class FolderSharing extends BrowserforcePlugin {
  public async retrieve(definition?) {
    const response = {
      enableEnhancedFolderSharing: true
    };
    try {
      const page = await this.browserforce.openPage(PATHS.BASE, {
        waitUntil: ['load', 'domcontentloaded', 'networkidle0']
      });
      const frameOrPage = await this.browserforce.waitForInFrameOrPage(
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
    return response;
  }

  public async apply(config) {
    if (config.enableEnhancedFolderSharing === false) {
      throw new Error(
        '`enableEnhancedFolderSharing` cannot be disabled once enabled'
      );
    }
    const page = await this.browserforce.openPage(PATHS.BASE);
    await page.waitFor(SELECTORS.ENABLE_CHECKBOX);
    await page.$eval(
      SELECTORS.ENABLE_CHECKBOX,
      (e: HTMLInputElement, v) => {
        e.checked = v;
      },
      config.enableEnhancedFolderSharing
    );
    await page.waitFor(SELECTORS.SAVE_BUTTON);
    await Promise.all([
      page.waitForNavigation(),
      page.click(SELECTORS.SAVE_BUTTON)
    ]);
  }
}
