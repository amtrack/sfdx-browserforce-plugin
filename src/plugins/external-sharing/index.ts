import { ShapePlugin } from '../../plugin';

export default class ExternalSharing extends ShapePlugin {
  public static schema = {
    name: 'ExternalSharing',
    description: 'External Sharing',
    properties: {
      enabled: {
        name: 'enabled',
        label: 'Enabled',
        selector: '#externalSharingModelButton'
      }
    }
  };

  protected static SELECTORS = {
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
    const page = await this.getPage();
    await page.goto(this.getBaseUrl());
    await page.waitFor(this.constructor['schema'].properties.enabled.selector);
    const value = await this.getValue(page);
    await page.close();
    return value;
  }

  public async apply(actions) {
    if (!actions || !actions.length) {
      return;
    }
    const action = actions[0];
    if (action.name === 'enabled') {
      const page = await this.getPage();
      await page.goto(this.getBaseUrl());
      await page.waitFor(
        this.constructor['schema'].properties.enabled.selector
      );
      page.on('dialog', async dialog => {
        await dialog.accept();
      });
      if (action.targetValue) {
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
      await page.close();
    } else {
      throw new Error(`invalid action ${JSON.stringify(action)}`);
    }
  }

  private async getValue(page) {
    const buttonOnclick = await page.$eval(
      this.constructor['schema'].properties.enabled.selector,
      el => el.onclick.toString()
    );
    return {
      enabled:
        buttonOnclick.indexOf(this.constructor['SELECTORS'].MODAL_DIALOG) >= 0
    };
  }
}
