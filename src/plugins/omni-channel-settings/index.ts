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
    // Open the omni-channel setup page
    const page = await this.browserforce.openPage(BASE_PATH);

    // Retrieve the service channel config
    await page.locator(STATUS_CAPACITY_TOGGLE_SELECTOR).waitFor();
    const enableStatusBasedCapacityModel = await page
      .locator(STATUS_CAPACITY_TOGGLE_SELECTOR)
      .evaluate((el) => (el.getAttribute('checked') === 'checked' ? true : false));

    return { enableStatusBasedCapacityModel };
  }

  public async apply(config: Config): Promise<void> {
    // Open the omni-channel setup page
    const page = await this.browserforce.openPage(BASE_PATH);

    // Click the checkbox
    await page.locator(STATUS_CAPACITY_TOGGLE_SELECTOR).waitFor();
    await page.locator(STATUS_CAPACITY_TOGGLE_SELECTOR).click();

    // Save the settings
    await page.locator(SAVE_BUTTON_SELECTOR).waitFor();
    await Promise.all([
      page.waitForLoadState('load'),
      page.locator(SAVE_BUTTON_SELECTOR).click(),
    ]);

    // Close the page
    await page.close();
  }
}
