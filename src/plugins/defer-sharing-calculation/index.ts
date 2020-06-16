import { BrowserforcePlugin } from '../../plugin';

const PATHS = {
  BASE: 'p/own/DeferSharingSetupPage'
};
const SELECTORS = {
  SUSPEND_BUTTON: 'input[name="rule_suspend"]',
  RESUME_BUTTON: 'input[name="rule_resume"]',
  RECALCULATE_BUTTON: 'input[name="rule_recalc"]'
};

export default class DeferSharingCalculation extends BrowserforcePlugin {
  public async retrieve(definition?) {
    const page = await this.browserforce.openPage(PATHS.BASE);
    await page.waitFor(SELECTORS.SUSPEND_BUTTON);
    await page.waitFor(SELECTORS.RESUME_BUTTON);

    const isSuspendDisabled = await page.$eval(
      SELECTORS.SUSPEND_BUTTON,
      (el: HTMLInputElement) => el.disabled
    );
    const isResumeDisabled = await page.$eval(
      SELECTORS.RESUME_BUTTON,
      (el: HTMLInputElement) => el.disabled
    );
    if (isSuspendDisabled && isResumeDisabled) {
      throw new Error(
        'Sharing recalculation is currently in progress, please wait until this has completed to plan'
      );
    }
    return {
      suspend: isSuspendDisabled
    };
  }

  public async apply(config) {
    const page = await this.browserforce.openPage(PATHS.BASE);
    const button = config.suspend
      ? SELECTORS.SUSPEND_BUTTON
      : SELECTORS.RESUME_BUTTON;
    await page.waitFor(button);
    await page.click(button);
    if (!config.suspend) {
      const refreshedPage = await this.browserforce.openPage(PATHS.BASE);
      await refreshedPage.click(SELECTORS.RECALCULATE_BUTTON);
    }
  }
}
