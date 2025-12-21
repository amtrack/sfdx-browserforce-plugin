import { BrowserforcePlugin } from '../../plugin.js';

const BASE_PATH = '/lightning/setup/SlackSetupAssistant/home';

const TOS_CHECKBOX = 'setup_service-slack-agree-to-terms input[type="checkbox"]';
// unfortunately the divs intercept pointer events so we need to click on the label instead
const TOS_CHECKBOX_TOGGLE = `setup_service-slack-agree-to-terms lightning-primitive-input-toggle`;
const SALES_CLOUD_FOR_SLACK_CHECKBOX = 'input[type="checkbox"][name="SlkSetupStepSalesCloudForSlack"]';
// unfortunately the divs intercept pointer events so we need to click on the label instead
const SALES_CLOUD_FOR_SLACK_CHECKBOX_TOGGLE = `lightning-primitive-input-toggle:has(${SALES_CLOUD_FOR_SLACK_CHECKBOX})`;

export type Config = {
  agreeToTermsAndConditions: boolean;
  enableSalesCloudForSlack: boolean;
};

export class Slack extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    await using page = await this.browserforce.openPage(BASE_PATH);
    const response = {
      agreeToTermsAndConditions: await page.locator(TOS_CHECKBOX).isChecked(),
      enableSalesCloudForSlack: await page.locator(SALES_CLOUD_FOR_SLACK_CHECKBOX).isChecked(),
    };
    return response;
  }

  public async apply(config: Config): Promise<void> {
    if (config.agreeToTermsAndConditions === false) {
      throw new Error('terms and conditions cannot be unaccepted once accepted');
    }
    const state = await this.retrieve();
    await using page = await this.browserforce.openPage(BASE_PATH);
    if (state.agreeToTermsAndConditions !== config.agreeToTermsAndConditions) {
      await Promise.all([page.waitForResponse(/handleSlackBetaTOSPref=1/), page.locator(TOS_CHECKBOX_TOGGLE).click()]);
    }
    if (state.enableSalesCloudForSlack !== config.enableSalesCloudForSlack) {
      await Promise.all([
        page.waitForResponse(/handleSlackSalesAppPrefToggle=1/),
        page.locator(SALES_CLOUD_FOR_SLACK_CHECKBOX_TOGGLE).click(),
      ]);
    }
  }
}
