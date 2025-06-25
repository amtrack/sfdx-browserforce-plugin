import { BrowserforcePlugin } from '../../plugin.js';

const BASE_PATH = 'p/own/DeferSharingSetupPage';

const SUSPEND_BUTTON_SELECTOR = 'input[name="rule_suspend"]';
const RESUME_BUTTON_SELECTOR = 'input[name="rule_resume"]';
const RECALCULATE_BUTTON_SELECTOR = 'input[name="rule_recalc"]';

type Config = {
  suspend: boolean;
};

export class DeferSharingCalculation extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const page = await this.browserforce.openPage(BASE_PATH);
    await page.waitForSelector(SUSPEND_BUTTON_SELECTOR);
    await page.waitForSelector(RESUME_BUTTON_SELECTOR);

    const isSuspendDisabled = await page
      .locator(SUSPEND_BUTTON_SELECTOR)
      .setWaitForEnabled(false)
      .map((input) => input.disabled)
      .wait();
    const isResumeDisabled = await page
      .locator(RESUME_BUTTON_SELECTOR)
      .setWaitForEnabled(false)
      .map((input) => input.disabled)
      .wait();
    if (isSuspendDisabled && isResumeDisabled) {
      throw new Error(
        'Sharing recalculation is currently in progress, please wait until this has completed to plan'
      );
    }
    await page.close();
    return {
      suspend: isSuspendDisabled,
    };
  }

  public async apply(config: Config): Promise<void> {
    const page = await this.browserforce.openPage(BASE_PATH);
    const button = config.suspend
      ? SUSPEND_BUTTON_SELECTOR
      : RESUME_BUTTON_SELECTOR;
    await Promise.all([page.waitForNavigation(), page.locator(button).click()]);
    await page.close();
    if (!config.suspend) {
      const refreshedPage = await this.browserforce.openPage(BASE_PATH);
      await Promise.all([
        refreshedPage.waitForNavigation(),
        refreshedPage.locator(RECALCULATE_BUTTON_SELECTOR).click(),
      ]);
      await refreshedPage.close();
    }
  }
}
