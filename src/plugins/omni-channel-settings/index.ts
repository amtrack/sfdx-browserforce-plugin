import { BrowserforcePlugin } from '../../plugin.js';

const BASE_PATH = 'omnichannel/settings.apexp';

const SAVE_BUTTON_SELECTOR = 'input[id$=":save"]';
const STATUS_CAPACITY_TOGGLE_SELECTOR = 'input[id$=":toggleOmniStatusCapModelPref"]';

type Config = {
  enableStatusBasedCapacityModel?: boolean;
};

export class OmniChannelSettings extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    // Open the omni-channel setup page
    const page = await this.browserforce.openPage(BASE_PATH);

    // Retrieve the service channel config
    await page.waitForSelector(STATUS_CAPACITY_TOGGLE_SELECTOR);
    const enableStatusBasedCapacityModel = await page.$eval(STATUS_CAPACITY_TOGGLE_SELECTOR, (el) =>
      el.getAttribute('checked') === 'checked' ? true : false,
    );

    return { enableStatusBasedCapacityModel };
  }

  public async apply(config: Config): Promise<void> {
    // Open the omni-channel setup page
    const page = await this.browserforce.openPage(BASE_PATH);

    // Click the checkbox
    const capacityModel = await page.waitForSelector(STATUS_CAPACITY_TOGGLE_SELECTOR);
    await capacityModel.click();

    // Save the settings
    const saveButton = await page.waitForSelector(SAVE_BUTTON_SELECTOR);
    await saveButton.click();

    // Wait for the page to refresh
    await page.waitForNavigation();

    // Close the page
    await page.close();
  }
}
