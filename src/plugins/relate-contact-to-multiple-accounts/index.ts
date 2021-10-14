import { BrowserforcePlugin } from '../../plugin';

const PATHS = {
  BASE: 'accounts/accountSetup.apexp'
};
const SELECTORS = {
  ENABLED: 'input[id$=":sharedContactsCheckBox"]',
  EDIT_BUTTON: 'input[id$=":edit"]',
  SAVE_BUTTON: 'input[id$=":save"]',
  DISABLE_CONFIRM: 'input[id$="disable_confirm"]',
  CONFIRM_BUTTON: 'input[id$="sharedContactsDisableConfirmButton"]'
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
    return response;
  }

  public async apply(config: Config): Promise<void> {
    const page = await this.browserforce.openPage(PATHS.BASE);
    await page.waitForSelector(SELECTORS.ENABLED);
    await page.click(SELECTORS.EDIT_BUTTON);
    await page.waitForNavigation();
    await page.waitForSelector(SELECTORS.ENABLED);
    await page.$eval(
      SELECTORS.ENABLED,
      (e: HTMLInputElement, v: boolean) => {
        e.checked = v;
      },
      config.enabled
    );
    /* if (config.enabled) { */
      // When enabling this setting, all we need to do is click the save button
      await Promise.all([
        page.click(SELECTORS.SAVE_BUTTON)
      ]);
    /*} else {
      await page.click(SELECTORS.SAVE_BUTTON);
      console.log('2');
      await page.waitForSelector(SELECTORS.DISABLE_CONFIRM);
      console.log('3');
      await page.click(SELECTORS.DISABLE_CONFIRM);
      console.log('4');
      await page.click(SELECTORS.CONFIRM_BUTTON);
      console.log('5');
    }*/
  }
}
