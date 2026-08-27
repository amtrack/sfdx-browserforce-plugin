import type { z } from 'zod';
import { BrowserforcePlugin } from '../../plugin.js';
import { schema } from './schema.js';

const BASE_PATH = '/email-admin/editOrgEmailSettings.apexp';

const ACCESS_LEVEL_SELECTOR = 'select[id$=":sendEmailAccessControlSelect"]';
const CONFIRM_MESSAGE_SELECTOR = 'span[id$=":successText"]';
const SAVE_BUTTON_SELECTOR = 'input[id$=":saveBtn"]';

const ACCESS_LEVEL_VALUES = new Map([
  ['No access', '0'],
  ['System email only', '1'],
  ['All email', '2'],
]);

export type Config = z.infer<typeof schema>;

export class EmailDeliverability extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    await using page = await this.browserforce.openPage(BASE_PATH);
    const selectedOption = await page.locator(`${ACCESS_LEVEL_SELECTOR} > option[selected]`).textContent();
    if (!selectedOption) {
      throw new Error('Selected access level not found...');
    }
    return {
      accessLevel: selectedOption as Config['accessLevel'],
    };
  }

  public async apply(config: Config): Promise<void> {
    const accessLevelNumber = config.accessLevel ? ACCESS_LEVEL_VALUES.get(config.accessLevel) : undefined;
    if (accessLevelNumber === undefined) {
      throw new Error(`Invalid email access level ${config.accessLevel}`);
    }
    await using page = await this.browserforce.openPage(BASE_PATH);
    await page.locator(ACCESS_LEVEL_SELECTOR).selectOption(accessLevelNumber);
    await page.locator(SAVE_BUTTON_SELECTOR).click();
    await page.locator(CONFIRM_MESSAGE_SELECTOR).waitFor();
  }
}
