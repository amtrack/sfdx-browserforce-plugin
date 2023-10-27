import { BrowserforcePlugin } from '../../../plugin';

const PATHS = {
  BASE: 'p/own/OrgSharingDetail'
};
const SELECTORS = {
  EXTERNAL_SHARING_MODEL_BUTTON: '#externalSharingModelButton',
  ENABLE_BUTTON: 'input#externalSharingModelButton:not([onclick*="Modal.confirm"])',
  DISABLE_BUTTON: 'input#externalSharingModelButton[onclick*="Modal.confirm"]',
  MODAL_DIALOG: 'Modal.confirm'
};

export type Config = {
  enableExternalSharingModel: boolean;
};

export class Sharing extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    const page = await this.browserforce.openPage(PATHS.BASE);
    await page.waitForSelector(SELECTORS.EXTERNAL_SHARING_MODEL_BUTTON);
    const buttonOnclick = await page.$eval(
      SELECTORS.EXTERNAL_SHARING_MODEL_BUTTON,
      (el: HTMLInputElement) => el.onclick?.toString() || ''
    );
    await page.close();
    return {
      enableExternalSharingModel: buttonOnclick.includes(SELECTORS.MODAL_DIALOG)
    };
  }

  public async apply(config: Config): Promise<void> {
    const page = await this.browserforce.openPage(PATHS.BASE);
    await page.waitForSelector(SELECTORS.EXTERNAL_SHARING_MODEL_BUTTON);
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    if (config.enableExternalSharingModel) {
      await Promise.all([page.waitForSelector(SELECTORS.DISABLE_BUTTON), page.click(SELECTORS.ENABLE_BUTTON)]);
    } else {
      await Promise.all([page.waitForSelector(SELECTORS.ENABLE_BUTTON), page.click(SELECTORS.DISABLE_BUTTON)]);
    }
    await page.close();
  }
}
