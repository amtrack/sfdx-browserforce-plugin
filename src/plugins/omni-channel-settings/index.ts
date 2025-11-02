import { BrowserforcePlugin } from '../../plugin.js';

const BASE_PATH = 'omnichannel/settings.apexp';

type Config = {
  enableStatusBasedCapacityModel?: boolean;
};

export class OmniChannelSettings extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const page = await this.browserforce.openPage(BASE_PATH);

    const enableStatusBasedCapacityModel = await page
      .getByRole('checkbox', { name: 'Enable Status-Based Capacity' }).isChecked();

    return { enableStatusBasedCapacityModel };
  }

  public async apply(config: Config): Promise<void> {
    // Open the omni-channel setup page
    const page = await this.browserforce.openPage(BASE_PATH);

    await page.getByRole('checkbox', { name: 'Enable Status-Based Capacity' }).click();

    await page.getByRole("button", {name: 'save'}).first().click();
    await page.waitForLoadState('networkidle')

    await page.close();
  }
}
