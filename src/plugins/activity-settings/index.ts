import { BrowserforcePlugin } from '../../plugin';

const PATHS = {
  BASE: 'setup/activitiesSetupPage.apexp'
};

const SELECTORS = {
  MANY_WHO_PREF_INPUT: 'input[id="thePage:theForm:theBlock:manyWhoPref"]',
  SUBMIT_BUTTON: 'input[id="thePage:theForm:theBlock:buttons:submit"]'
};

type Config = {
  allowUsersToRelateMultipleContactsToTasksAndEvents: boolean;
};

export class ActivitySettings extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    const page = await this.browserforce.openPage(PATHS.BASE);
    await page.waitForSelector(SELECTORS.MANY_WHO_PREF_INPUT);
    const response = {
      allowUsersToRelateMultipleContactsToTasksAndEvents: await page.$eval(
        SELECTORS.MANY_WHO_PREF_INPUT,
        (el: HTMLInputElement) => el.checked
      )
    };
    await page.close();
    return response;
  }

  public async apply(config: Config): Promise<void> {
    if (config.allowUsersToRelateMultipleContactsToTasksAndEvents === false) {
      throw new Error(
        '`allowUsersToRelateMultipleContactsToTasksAndEvents` can only be disabled with help of the salesforce.com Support team'
      );
    }
    const page = await this.browserforce.openPage(PATHS.BASE);
    await page.waitForSelector(SELECTORS.MANY_WHO_PREF_INPUT);
    await page.$eval(
      SELECTORS.MANY_WHO_PREF_INPUT,
      (e: HTMLInputElement, v: boolean) => {
        e.checked = v;
      },
      config.allowUsersToRelateMultipleContactsToTasksAndEvents
    );
    await Promise.all([
      page.waitForNavigation(),
      page.click(SELECTORS.SUBMIT_BUTTON)
    ]);
    await page.close();
  }
}
