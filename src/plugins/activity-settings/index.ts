import { BrowserforcePlugin } from '../../plugin';

const PATHS = {
  BASE: 'setup/activitiesSetupPage.apexp'
};

const SELECTORS = {
  MANY_WHO_PREF_INPUT: 'input[id="thePage:theForm:theBlock:manyWhoPref"]',
  SUBMIT_BUTTON: 'input[id="thePage:theForm:theBlock:buttons:submit"]'
};

export default class ActivitySettings extends BrowserforcePlugin {
  public async retrieve() {
    const page = await this.browserforce.openPage(PATHS.BASE, {
      waitUntil: ['load', 'domcontentloaded', 'networkidle0']
    });
    await page.waitFor(SELECTORS.MANY_WHO_PREF_INPUT);
    const response = {
      allowUsersToRelateMultipleContactsToTasksAndEvents: await page.$eval(
        SELECTORS.MANY_WHO_PREF_INPUT,
        (el: HTMLInputElement) => el.checked
      )
    };
    return response;
  }

  public async apply(config) {
    if (config.allowUsersToRelateMultipleContactsToTasksAndEvents === false) {
      throw new Error(
        '`allowUsersToRelateMultipleContactsToTasksAndEvents` can only be disabled with help of the salesforce.com Support team'
      );
    }
    const page = await this.browserforce.openPage(PATHS.BASE, {
      waitUntil: ['load', 'domcontentloaded', 'networkidle0']
    });
    await page.waitFor(SELECTORS.MANY_WHO_PREF_INPUT);
    await page.$eval(
      SELECTORS.MANY_WHO_PREF_INPUT,
      (e: HTMLInputElement, v) => {
        e.checked = v;
      },
      config.allowUsersToRelateMultipleContactsToTasksAndEvents
    );
    await Promise.all([
      page.waitForNavigation(),
      page.click(SELECTORS.SUBMIT_BUTTON)
    ]);
  }
}
