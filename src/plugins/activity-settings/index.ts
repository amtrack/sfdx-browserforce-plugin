import { BrowserforcePlugin } from '../../plugin.js';
import { setCheckboxMapFn } from '../../puppeteer.js';

const BASE_PATH = 'setup/activitiesSetupPage.apexp';

const MANY_WHO_PREF_INPUT_SELECTOR =
  'input[id="thePage:theForm:theBlock:manyWhoPref"]';
const SUBMIT_BUTTON_SELECTOR =
  'input[id="thePage:theForm:theBlock:buttons:submit"]';

type Config = {
  allowUsersToRelateMultipleContactsToTasksAndEvents: boolean;
};

export class ActivitySettings extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    const page = await this.browserforce.openPage(BASE_PATH);
    const response = {
      allowUsersToRelateMultipleContactsToTasksAndEvents: await page
        .locator(MANY_WHO_PREF_INPUT_SELECTOR)
        .map((checkbox) => checkbox.checked)
        .wait(),
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
    const page = await this.browserforce.openPage(BASE_PATH);
    await page
      .locator(MANY_WHO_PREF_INPUT_SELECTOR)
      .map(
        setCheckboxMapFn(
          config.allowUsersToRelateMultipleContactsToTasksAndEvents
        )
      )
      .wait();
    await Promise.all([
      page.waitForNavigation(),
      page.locator(SUBMIT_BUTTON_SELECTOR).click(),
    ]);
    await page.close();
  }
}
