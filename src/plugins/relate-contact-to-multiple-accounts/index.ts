import { BrowserforcePlugin } from '../../plugin';

const PATHS = {
  BASE: 'accounts/accountSetup.apexp'
};
const SELECTORS = {
  ENABLED: 'input[id$=":sharedContactsCheckBox"]',
  EDIT_BUTTON: 'input[id$=":edit"]',
  SAVE_BUTTON: 'input[id$=":save"]'
};

type Config = {
  enabled: boolean;
};

export class RelateContactToMultipleAccounts extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const page = await this.browserforce.openPage(PATHS.BASE);
    await page.waitForSelector(SELECTORS.ENABLED);
    const response = {
      enabled: await page.$eval(
        SELECTORS.ENABLED,
        (el: HTMLInputElement) => el.checked
      )
    };
    await page.close();
    return response;
  }

  public async apply(config: Config): Promise<void> {
    const page = await this.browserforce.openPage(PATHS.BASE);
    // First we have to click the 'Edit' button, to make the checkbox editable
    await page.waitForSelector(SELECTORS.EDIT_BUTTON);
    await Promise.all([
      page.waitForNavigation(),
      page.click(SELECTORS.EDIT_BUTTON)
    ])
    // Change the value of the checkbox
    await page.waitForSelector(SELECTORS.ENABLED);
    await page.$eval(
      SELECTORS.ENABLED,
      (e: HTMLInputElement, v: boolean) => {
        e.checked = v;
      },
      config.enabled
    );
    // Save
    await page.waitForSelector(SELECTORS.SAVE_BUTTON);
    await Promise.all([
      page.waitForNavigation(),
      page.click(SELECTORS.SAVE_BUTTON)
    ]);
    await page.close();
  }
}
