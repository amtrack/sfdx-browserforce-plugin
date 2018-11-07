import { BrowserforcePlugin } from '../../../plugin';

const PATHS = {
  BASE: 'p/own/OrgSharingDetail'
};
const SELECTORS = {
  EXTERNAL_SHARING_MODEL_BUTTON: '#externalSharingModelButton',
  ENABLE_BUTTON:
    'input#externalSharingModelButton:not([onclick*="Modal.confirm"])',
  DISABLE_BUTTON: 'input#externalSharingModelButton[onclick*="Modal.confirm"]',
  MODAL_DIALOG: 'Modal.confirm'
};

export default class Sharing extends BrowserforcePlugin {
  public async retrieve(definition?) {
    const page = this.browserforce.page;
    await page.goto(`${this.browserforce.getInstanceUrl()}/${PATHS.BASE}`);
    await page.waitFor(SELECTORS.EXTERNAL_SHARING_MODEL_BUTTON);
    const buttonOnclick = await page.$eval(
      SELECTORS.EXTERNAL_SHARING_MODEL_BUTTON,
      (el: HTMLInputElement) => el.onclick.toString()
    );
    return {
      enableExternalSharingModel:
        buttonOnclick.indexOf(SELECTORS.MODAL_DIALOG) >= 0
    };
  }

  public async apply(config) {
    const page = this.browserforce.page;
    await page.goto(`${this.browserforce.getInstanceUrl()}/${PATHS.BASE}`);
    await page.waitFor(SELECTORS.EXTERNAL_SHARING_MODEL_BUTTON);
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    if (config.enableExternalSharingModel) {
      await Promise.all([
        page.waitFor(SELECTORS.DISABLE_BUTTON),
        page.click(SELECTORS.ENABLE_BUTTON)
      ]);
    } else {
      await Promise.all([
        page.waitFor(SELECTORS.ENABLE_BUTTON),
        page.click(SELECTORS.DISABLE_BUTTON)
      ]);
    }
  }
}
