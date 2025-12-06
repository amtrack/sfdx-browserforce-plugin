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
    await using page = await this.browserforce.openPage(BASE_PATH);
    const enableStatusBasedCapacityModel = await page
      .locator(STATUS_CAPACITY_TOGGLE_SELECTOR)
      .isChecked();
    return { enableStatusBasedCapacityModel };
  }

  public async apply(config: Config): Promise<void> {
    await using page = await this.browserforce.openPage(BASE_PATH);
    await page.locator(STATUS_CAPACITY_TOGGLE_SELECTOR).click();
    await page.locator(SAVE_BUTTON_SELECTOR).click();
    // omnichannel/settings.apexp
    // ->
    // omnichannel/settings.apexp?setupid=OmniChannelSettings
    await page.waitForURL((url) =>
      url.searchParams.has('setupid', 'OmniChannelSettings')
    );
  }
}
