import { BrowserforcePlugin } from '../../plugin';

const PATHS = {
  BASE: '_ui/networks/setup/NetworkSettingsPage'
};
const SELECTORS = {
  BASE: 'div.pbBody',
  ENABLE_CHECKBOX: 'input[id$=":enableNetworkPrefId"]',
  DOMAIN_NAME_INPUT_TEXT: 'input[id$=":inputSubdomain"]',
  SAVE_BUTTON: 'input[id$=":saveId"]'
};

export default class Communities extends BrowserforcePlugin {
  public async retrieve() {
    const page = await this.browserforce.openPage(PATHS.BASE, {
      waitUntil: ['load', 'domcontentloaded', 'networkidle0']
    });
    const frameOrPage = await this.browserforce.waitForInFrameOrPage(
      page,
      SELECTORS.BASE
    );
    const response = {};
    const inputEnable = await frameOrPage.$(SELECTORS.ENABLE_CHECKBOX);
    if (inputEnable) {
      response['enabled'] = await frameOrPage.$eval(
        SELECTORS.ENABLE_CHECKBOX,
        (el: HTMLInputElement) => el.checked
      );
    } else {
      // already enabled
      response['enabled'] = true;
    }
    return response;
  }

  public async apply(config) {
    if (config.enabled === false) {
      throw new Error('`enabled` cannot be disabled once enabled');
    }

    const page = await this.browserforce.openPage(PATHS.BASE, {
      waitUntil: ['load', 'domcontentloaded', 'networkidle0']
    });
    const frameOrPage = await this.browserforce.waitForInFrameOrPage(
      page,
      SELECTORS.ENABLE_CHECKBOX
    );
    await frameOrPage.click(SELECTORS.ENABLE_CHECKBOX);
    const domainName = (
      config.domainName ||
      this.browserforce.getMyDomain() ||
      `comm-${Math.random()
        .toString(36)
        .substr(2)}`
    ).substring(0, 22);
    await frameOrPage.waitFor(SELECTORS.DOMAIN_NAME_INPUT_TEXT);
    await frameOrPage.type(SELECTORS.DOMAIN_NAME_INPUT_TEXT, domainName);
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    await frameOrPage.waitFor(SELECTORS.SAVE_BUTTON);
    await Promise.all([
      page.waitForNavigation(),
      frameOrPage.click(SELECTORS.SAVE_BUTTON)
    ]);
  }
}
