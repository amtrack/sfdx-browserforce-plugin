import { BrowserforcePlugin } from '../../plugin.js';

const PATHS = {
  BASE: 'lightning/setup/SlackSetupAssistant/home',
};
const TOS_CHECKBOX =
  'setup_service-slack-agree-to-terms input[type="checkbox"]';
const SALES_CLOUD_FOR_SLACK_CHECKBOX =
  'input[type="checkbox"][name="SlkSetupStepSalesCloudForSlack"]';
const TOAST_MESSAGE = 'div[id^="toastDescription"]';

export type Config = {
  agreeToTermsAndConditions: boolean;
  enableSalesCloudForSlack: boolean;
};

export class Slack extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const page = await this.browserforce.openPage(PATHS.BASE);
    const response = {
      agreeToTermsAndConditions: await page
        .locator(TOS_CHECKBOX)
        .map((checkbox) => checkbox.checked)
        .wait(),
      enableSalesCloudForSlack: await page
        .locator(SALES_CLOUD_FOR_SLACK_CHECKBOX)
        .map((checkbox) => checkbox.checked)
        .wait(),
    };
    await page.close();
    return response;
  }

  public async apply(config: Config): Promise<void> {
    if (config.agreeToTermsAndConditions === false) {
      throw new Error(
        'terms and conditions cannot be unaccepted once accepted'
      );
    }
    const state = await this.retrieve();
    const page = await this.browserforce.openPage(PATHS.BASE);
    if (state.agreeToTermsAndConditions !== config.agreeToTermsAndConditions) {
      await Promise.all([
        page.locator(TOAST_MESSAGE).wait(),
        // NOTE: Unfortunately a simple click() on the locator does not work here
        (
          await page.locator(TOS_CHECKBOX).waitHandle()
        ).evaluate((checkbox) => checkbox.click()),
      ]);
      await page.waitForSelector(TOAST_MESSAGE, { hidden: true });
    }
    if (state.enableSalesCloudForSlack !== config.enableSalesCloudForSlack) {
      await Promise.all([
        page.locator(TOAST_MESSAGE).wait(),
        // NOTE: Unfortunately a simple click() on the locator does not work here
        (
          await page.locator(SALES_CLOUD_FOR_SLACK_CHECKBOX).waitHandle()
        ).evaluate((checkbox) => checkbox.click()),
      ]);
      await page.waitForSelector(TOAST_MESSAGE, { hidden: true });
    }
    await page.close();
  }
}
