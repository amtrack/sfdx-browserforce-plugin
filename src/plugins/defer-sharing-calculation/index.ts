import { BrowserforcePlugin } from '../../plugin';

const PATHS = {
  BASE: 'p/own/DeferSharingSetupPage'
};
const SELECTORS = {
  SUSPEND_BUTTON: 'input[name="rule_suspend"]',
  RESUME_BUTTON: 'input[name="rule_resume"]',
  RECALCULATE_BUTTON: 'input[name="rule_recalc"]'
};

type Config = {
  suspend: boolean;
};

export class DeferSharingCalculation extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const page = await this.browserforce.openPage(PATHS.BASE);
    await page.waitForSelector(SELECTORS.SUSPEND_BUTTON);
    await page.waitForSelector(SELECTORS.RESUME_BUTTON);

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
    await page.close();
    return {
      suspend: isSuspendDisabled
    };
  }

  public async apply(config: Config): Promise<void> {
    const page = await this.browserforce.openPage(PATHS.BASE);
    const button = config.suspend
      ? SELECTORS.SUSPEND_BUTTON
      : SELECTORS.RESUME_BUTTON;
    await page.waitForSelector(button);
    await Promise.all([page.waitForNavigation(), page.click(button)]);
    await page.close();
    if (!config.suspend) {
      const refreshedPage = await this.browserforce.openPage(PATHS.BASE);
      await refreshedPage.waitForSelector(SELECTORS.RECALCULATE_BUTTON);
      await Promise.all([
        refreshedPage.waitForNavigation(),
        refreshedPage.click(SELECTORS.RECALCULATE_BUTTON)
      ]);
      await refreshedPage.close();
    }
  }
}
