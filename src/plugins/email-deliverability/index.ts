import { BrowserforcePlugin } from '../../plugin.js';

const BASE_PATH = 'email-admin/editOrgEmailSettings.apexp';

const ACCESS_LEVEL_SELECTOR = 'select[id$=":sendEmailAccessControlSelect"]';
const ACCESS_LEVEL_SELECTED_SELECTOR =
  'select[id$=":sendEmailAccessControlSelect"] > option[selected]';
const CONFIRM_MESSAGE_SELECTOR = 'span[id$=":successText"]';
const SAVE_BUTTON_SELECTOR = 'input[id$=":saveBtn"]';

const ACCESS_LEVEL_VALUES = new Map([
  ['No access', '0'],
  ['System email only', '1'],
  ['All email', '2'],
]);

type Config = {
  accessLevel: string;
};

export class EmailDeliverability extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const page = await this.browserforce.openPage(BASE_PATH);
    const accessLevel = await page
      .locator(ACCESS_LEVEL_SELECTED_SELECTOR)
      .map((option) => option.textContent)
      .wait();
    await page.close();
    if (!accessLevel) {
      throw new Error('Selected access level not found...');
    }
    return {
      accessLevel,
    };
  }

  public async apply(config: Config): Promise<void> {
    const accessLevelNumber = ACCESS_LEVEL_VALUES.get(config.accessLevel);
    if (accessLevelNumber === undefined) {
      throw new Error(`Invalid email access level ${config.accessLevel}`);
    }
    const page = await this.browserforce.openPage(BASE_PATH);
    await page.locator(ACCESS_LEVEL_SELECTOR).fill(accessLevelNumber);
    await Promise.all([
      page.locator(CONFIRM_MESSAGE_SELECTOR).wait(),
      page.locator(SAVE_BUTTON_SELECTOR).click(),
    ]);
    await page.close();
  }
}
