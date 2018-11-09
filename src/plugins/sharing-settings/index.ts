import { ShapePlugin } from '../../plugin';

export default class ExternalSharing extends ShapePlugin {
  public static schema = require('./schema.json');

  protected static SELECTORS = {
    ENABLED: '#externalSharingModelButton',
    ENABLE_BUTTON:
      'input#externalSharingModelButton:not([onclick*="Modal.confirm"])',
    DISABLE_BUTTON:
      'input#externalSharingModelButton[onclick*="Modal.confirm"]',
    MODAL_DIALOG: 'Modal.confirm'
  };
  protected static PATHS = {
    BASE: '/p/own/OrgSharingDetail'
  };

  public async retrieve() {
    const page = this.browserforce.page;
    await page.goto(this.getBaseUrl());
    await page.waitFor(this.constructor['SELECTORS'].ENABLED);
    const value = await this.getValue(page);
    return value;
  }

  public async apply(config) {
    const page = this.browserforce.page;
    await page.goto(this.getBaseUrl());
    await page.waitFor(this.constructor['SELECTORS'].ENABLED);
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    if (config.enableExternalSharingModel) {
      await Promise.all([
        page.waitFor(this.constructor['SELECTORS'].DISABLE_BUTTON),
        page.click(this.constructor['SELECTORS'].ENABLE_BUTTON)
      ]);
    } else {
      await Promise.all([
        page.waitFor(this.constructor['SELECTORS'].ENABLE_BUTTON),
        page.click(this.constructor['SELECTORS'].DISABLE_BUTTON)
      ]);
    }
  }

  private async getValue(page) {
    const buttonOnclick = await page.$eval(
      this.constructor['SELECTORS'].ENABLED,
      el => el.onclick.toString()
    );
    return {
      enableExternalSharingModel:
        buttonOnclick.indexOf(this.constructor['SELECTORS'].MODAL_DIALOG) >= 0
    };
  }
}
