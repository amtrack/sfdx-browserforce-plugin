import { BrowserforcePlugin } from '../../plugin.js';

const BASE_PATH = '_ui/networks/setup/NetworkSettingsPage';

const ENABLE_CHECKBOX_SELECTOR = 'input[id$=":enableNetworkPrefId"]';
const SAVE_BUTTON_SELECTOR = 'input[id$=":saveId"]';
const CANCEL_BUTTON_SELECTOR = 'input[name="cancel"]';

type Config = {
  enabled: boolean;
};

export class Communities extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    const isLeX = await this.browserforce.isLEX();
    const page = await this.browserforce.openPage(BASE_PATH);
    const frameOrPage = isLeX
      ? await this.browserforce.waitForIframe(page)
      : page;
    const inputType = await frameOrPage
      .locator(`${ENABLE_CHECKBOX_SELECTOR}, ${CANCEL_BUTTON_SELECTOR}`)
      .map((input) => input.type)
      .wait();
    const response = {
      enabled: inputType === 'submit',
    };
    console.error({ response });
    await page.close();
    return response;
  }

  public async apply(config: Config): Promise<void> {
    if (!config.enabled) {
      throw new Error('`enabled` cannot be disabled once enabled');
    }
    const page = await this.browserforce.openPage(BASE_PATH);
    const isLeX = await this.browserforce.isLEX();
    const frameOrPage = isLeX
      ? await this.browserforce.waitForIframe(page)
      : page;
    await frameOrPage.locator(ENABLE_CHECKBOX_SELECTOR).click();
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    await Promise.all([
      page.waitForNavigation(),
      frameOrPage.locator(SAVE_BUTTON_SELECTOR).click(),
    ]);
    await page.close();
  }
}
