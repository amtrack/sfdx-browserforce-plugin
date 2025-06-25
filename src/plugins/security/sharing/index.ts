import { BrowserforcePlugin } from '../../../plugin.js';

const BASE_PATH = 'p/own/OrgSharingDetail';

const EXTERNAL_SHARING_MODEL_BUTTON_SELECTOR =
  'input#externalSharingModelButton';
const ENABLE_BUTTON_SELECTOR =
  'input#externalSharingModelButton:not([onclick*="Modal.confirm"])';
const DISABLE_BUTTON_SELECTOR =
  'input#externalSharingModelButton[onclick*="Modal.confirm"]';
const MODAL_CONFIRM_FN_NAME = 'Modal.confirm';

export type Config = {
  enableExternalSharingModel: boolean;
};

export class Sharing extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    const page = await this.browserforce.openPage(BASE_PATH);
    const buttonOnclickText = await page
      .locator(EXTERNAL_SHARING_MODEL_BUTTON_SELECTOR)
      .setWaitForEnabled(false)
      .map((input) => input.onclick?.toString() ?? '')
      .wait();
    await page.close();
    const enableExternalSharingModel = buttonOnclickText.includes(
      MODAL_CONFIRM_FN_NAME
    );
    console.error({ enableExternalSharingModel });
    return {
      enableExternalSharingModel,
    };
  }

  public async apply(config: Config): Promise<void> {
    const page = await this.browserforce.openPage(BASE_PATH);
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    if (config.enableExternalSharingModel) {
      await Promise.all([
        page.locator(DISABLE_BUTTON_SELECTOR).wait(),
        page.locator(ENABLE_BUTTON_SELECTOR).click(),
      ]);
    } else {
      await Promise.all([
        page.locator(ENABLE_BUTTON_SELECTOR).wait(),
        page.locator(DISABLE_BUTTON_SELECTOR).click(),
      ]);
    }
    await page.close();
  }
}
