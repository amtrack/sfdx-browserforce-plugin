import { BrowserforcePlugin } from '../../../plugin.js';

const BASE_PATH = 'p/own/OrgSharingDetail';

const EXTERNAL_SHARING_MODEL_BUTTON_SELECTOR = '#externalSharingModelButton';
const ENABLE_BUTTON_SELECTOR =
  'input#externalSharingModelButton:not([onclick*="Modal.confirm"])';
const DISABLE_BUTTON_SELECTOR =
  'input#externalSharingModelButton[onclick*="Modal.confirm"]';
const MODAL_DIALOG_SELECTOR = 'Modal.confirm';

export type Config = {
  enableExternalSharingModel: boolean;
};

export class Sharing extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    const page = await this.browserforce.openPage(BASE_PATH);
    await page.waitForSelector(EXTERNAL_SHARING_MODEL_BUTTON_SELECTOR);
    const buttonOnclick = await page.$eval(
      EXTERNAL_SHARING_MODEL_BUTTON_SELECTOR,
      (el: HTMLInputElement) => el.onclick?.toString() || ''
    );
    await page.close();
    return {
      enableExternalSharingModel: buttonOnclick.includes(MODAL_DIALOG_SELECTOR),
    };
  }

  public async apply(config: Config): Promise<void> {
    const page = await this.browserforce.openPage(BASE_PATH);
    await page.waitForSelector(EXTERNAL_SHARING_MODEL_BUTTON_SELECTOR);
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    if (config.enableExternalSharingModel) {
      await Promise.all([
        page.waitForSelector(DISABLE_BUTTON_SELECTOR),
        page.click(ENABLE_BUTTON_SELECTOR),
      ]);
    } else {
      await Promise.all([
        page.waitForSelector(ENABLE_BUTTON_SELECTOR),
        page.click(DISABLE_BUTTON_SELECTOR),
      ]);
    }
    await page.close();
  }
}
