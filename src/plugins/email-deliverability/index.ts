import { BrowserforcePlugin } from '../../plugin.js';

const BASE_PATH = 'email-admin/editOrgEmailSettings.apexp';

const ACCESS_LEVEL_SELECTOR = 'select[id$=":sendEmailAccessControlSelect"]';
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
    await page.waitForSelector(ACCESS_LEVEL_SELECTOR);
    const selectedOptions = await page.$$eval(`${ACCESS_LEVEL_SELECTOR} > option[selected]`, (options) =>
      options.map((option) => option.textContent ?? ''),
    );
    await page.close();
    if (!selectedOptions) {
      throw new Error('Selected access level not found...');
    }
    return {
      accessLevel: selectedOptions[0],
    };
  }

  public async apply(config: Config): Promise<void> {
    const accessLevelNumber = ACCESS_LEVEL_VALUES.get(config.accessLevel);
    if (accessLevelNumber === undefined) {
      throw new Error(`Invalid email access level ${config.accessLevel}`);
    }
    const page = await this.browserforce.openPage(BASE_PATH);
    await page.waitForSelector(ACCESS_LEVEL_SELECTOR);
    await page.select(ACCESS_LEVEL_SELECTOR, accessLevelNumber);
    await Promise.all([page.waitForSelector(CONFIRM_MESSAGE_SELECTOR), page.click(SAVE_BUTTON_SELECTOR)]);
    await page.close();
  }
}
