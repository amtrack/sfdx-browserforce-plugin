import { BrowserforcePlugin } from '../../plugin';

const PATHS = {
  BASE: 'email-admin/editOrgEmailSettings.apexp'
};
const SELECTORS = {
  ACCESS_LEVEL: 'select[id$=":sendEmailAccessControlSelect"]',
  CONFIRM_MESSAGE: 'span[id$=":successText"]',
  SAVE_BUTTON: 'input[id$=":saveBtn"]'
};
const ACCESS_LEVEL_VALUES = new Map([
  ['No access', '0',],
  ['System email only', '1',],
  ['All email', '2']
]);

type Config = {
  accessLevel: string;
};

export class EmailDeliverability extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const page = await this.browserforce.openPage(PATHS.BASE);
    await page.waitForSelector(SELECTORS.ACCESS_LEVEL);
    const selectedOptions = await page.$$eval(
      `${SELECTORS.ACCESS_LEVEL} > option[selected]`,
      options => options.map(option => option.textContent)
    );
    await page.close();
    if (!selectedOptions) {
      throw new Error('Selected access level not found...')
    }
    return {
      accessLevel: selectedOptions[0]
    };;
  }

  public async apply(config: Config): Promise<void> {
    if (!ACCESS_LEVEL_VALUES.has(config.accessLevel)) {
      throw new Error(`Invalid email access level ${config.accessLevel}`);
    }
    const page = await this.browserforce.openPage(PATHS.BASE);
    await page.waitForSelector(SELECTORS.ACCESS_LEVEL);
    await page.select(SELECTORS.ACCESS_LEVEL, ACCESS_LEVEL_VALUES.get(config.accessLevel));
    await Promise.all([
      page.waitForSelector(SELECTORS.CONFIRM_MESSAGE),
      page.click(SELECTORS.SAVE_BUTTON)
    ]);
    await page.close();
  }
}
