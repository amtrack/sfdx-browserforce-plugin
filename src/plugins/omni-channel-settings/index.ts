import { BrowserforcePlugin } from '../../plugin.js';

const BASE_PATH = 'omnichannel/settings.apexp';

const SAVE_BUTTON_SELECTOR = 'input[id$=":save"]';
const STATUS_CAPACITY_TOGGLE_SELECTOR =
  'input[id$=":toggleOmniStatusCapModelPref"]';

type Config = {
  enableStatusBasedCapacityModel?: boolean;
};

export class OmniChannelSettings extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const page = await this.browserforce.openPage(BASE_PATH);
    const enableStatusBasedCapacityModel = await page
      .locator(STATUS_CAPACITY_TOGGLE_SELECTOR)
      .map((checkbox) => checkbox.checked)
      .wait();
    await page.close();
    return { enableStatusBasedCapacityModel };
  }

  public async apply(config: Config): Promise<void> {
    const page = await this.browserforce.openPage(BASE_PATH);
    await page.locator(STATUS_CAPACITY_TOGGLE_SELECTOR).click();
    await Promise.all([
      page.waitForNavigation(),
      page.locator(SAVE_BUTTON_SELECTOR).click(),
    ]);
    await page.close();
  }
}
