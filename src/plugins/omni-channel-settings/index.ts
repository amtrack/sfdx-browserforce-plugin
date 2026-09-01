import { z } from 'zod';
import { BrowserforcePlugin } from '../../plugin.js';

export const omniChannelSettingsSchema = z
  .object({
    enableStatusBasedCapacityModel: z
      .boolean()
      .meta({
        title: 'Enable Status-Based Capacity Model',
      })
      .describe('Route and track work based on changes to work status and ownership.')
      .optional(),
  })
  .meta({ id: 'omniChannelSettings', title: 'Omni-Channel Settings' });

const BASE_PATH = '/omnichannel/settings.apexp';

const SAVE_BUTTON_SELECTOR = 'input[id$=":save"]';
const STATUS_CAPACITY_TOGGLE_SELECTOR = 'input[id$=":toggleOmniStatusCapModelPref"]';

export type OmniChannelSettingsConfig = z.infer<typeof omniChannelSettingsSchema>;

export class OmniChannelSettings extends BrowserforcePlugin {
  public async retrieve(definition?: OmniChannelSettingsConfig): Promise<OmniChannelSettingsConfig> {
    await using page = await this.browserforce.openPage(BASE_PATH);
    const enableStatusBasedCapacityModel = await page.locator(STATUS_CAPACITY_TOGGLE_SELECTOR).isChecked();
    return { enableStatusBasedCapacityModel };
  }

  public async apply(config: OmniChannelSettingsConfig): Promise<void> {
    await using page = await this.browserforce.openPage(BASE_PATH);
    await page.locator(STATUS_CAPACITY_TOGGLE_SELECTOR).click();
    await page.locator(SAVE_BUTTON_SELECTOR).click();
    // omnichannel/settings.apexp
    // ->
    // omnichannel/settings.apexp?setupid=OmniChannelSettings
    await page.waitForURL((url) => url.searchParams.has('setupid', 'OmniChannelSettings'));
  }
}
