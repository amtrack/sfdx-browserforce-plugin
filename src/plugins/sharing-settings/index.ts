import { ShapePlugin } from '../../plugin';

const PATHS = {
  BASE: 'p/own/OrgSharingDetail'
};
const SELECTORS = {
  ENABLED: '#externalSharingModelButton',
  ENABLE_BUTTON:
    'input#externalSharingModelButton:not([onclick*="Modal.confirm"])',
  DISABLE_BUTTON: 'input#externalSharingModelButton[onclick*="Modal.confirm"]',
  MODAL_DIALOG: 'Modal.confirm'
};

export default class ExternalSharing extends ShapePlugin {
  public async retrieve() {
    const page = this.browserforce.page;
    await page.goto(`${this.browserforce.getInstanceUrl()}/${PATHS.BASE}`);
    await page.waitFor(SELECTORS.ENABLED);
    const buttonOnclick = await page.$eval(
      SELECTORS.ENABLED,
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
    await page.waitFor(SELECTORS.ENABLED);
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
