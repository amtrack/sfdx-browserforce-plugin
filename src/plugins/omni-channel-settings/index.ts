import { BrowserforcePlugin } from '../../plugin';

const PATHS = {
  BASE: 'omnichannel/settings.apexp'
};

const SELECTORS = {
  SAVE_BUTTON: 'input[id$=":save"]',
  STATUS_CAPACITY_TOGGLE: 'input[id$=":toggleOmniStatusCapModelPref"]'
};

type Config = {
  enableStatusBasedCapacityModel?: boolean;
};

export class OmniChannelSettings extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    // Open the omni-channel setup page
    const page = await this.browserforce.openPage(PATHS.BASE);

    // Retrieve the service channel config
    const enableStatusBasedCapacityModel = await page.$eval(SELECTORS.STATUS_CAPACITY_TOGGLE, el => (el.getAttribute('checked') === "checked" ? true : false));

    return { enableStatusBasedCapacityModel };
  }

  public async apply(config: Config): Promise<void> {
    // Open the omni-channel setup page
    const page = await this.browserforce.openPage(PATHS.BASE);
    
    // Click the checkbox
    await page.waitForSelector(SELECTORS.STATUS_CAPACITY_TOGGLE);
    await page.click(SELECTORS.STATUS_CAPACITY_TOGGLE);

    // Save the settings
    await page.waitForSelector(SELECTORS.SAVE_BUTTON);
    await page.click(SELECTORS.SAVE_BUTTON);
    await page.close();
  }
}
