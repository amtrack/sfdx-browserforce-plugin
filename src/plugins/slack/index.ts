import { BrowserforcePlugin } from '../../plugin.js';

const PATHS = {
  BASE: 'lightning/setup/SlackSetupAssistant/home'
};
const SELECTORS = {
  TOS_LIGHTNING_INPUT:
    'setup_service-slack-setup-assistant-container >>> setup_service-slack-agree-to-terms >>> lightning-input',
  SALES_CLOUD_FOR_SLACK_TOGGLE:
    'setup_service-slack-setup-assistant-container >>> setup_service-stage >>> setup_service-steps >>> setup_service-step >>> lightning-input:has(lightning-primitive-input-toggle input[name="SlkSetupStepSalesCloudForSlack"])',
  TOAST_MESSAGE: 'div[id^="toastDescription"]'
};

export type Config = {
  agreeToTermsAndConditions: boolean;
  enableSalesCloudForSlack: boolean;
};

export class Slack extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const page = await this.browserforce.openPage(PATHS.BASE);
    await page.waitForSelector(SELECTORS.TOS_LIGHTNING_INPUT, { visible: true });
    await page.waitForSelector(SELECTORS.SALES_CLOUD_FOR_SLACK_TOGGLE, { visible: true });
    const response = {
      agreeToTermsAndConditions: await page.$eval(SELECTORS.TOS_LIGHTNING_INPUT, (el) => el.hasAttribute('checked')),
      enableSalesCloudForSlack: await page.$eval(SELECTORS.SALES_CLOUD_FOR_SLACK_TOGGLE, (el) =>
        el.hasAttribute('checked')
      )
    };
    await page.close();
    return response;
  }

  public async apply(config: Config): Promise<void> {
    if (config.agreeToTermsAndConditions === false) {
      throw new Error('terms and conditions cannot be unaccepted once accepted');
    }
    const state = await this.retrieve();
    const page = await this.browserforce.openPage(PATHS.BASE);
    await page.waitForSelector(SELECTORS.TOS_LIGHTNING_INPUT, { visible: true });
    if (state.agreeToTermsAndConditions !== config.agreeToTermsAndConditions) {
      await Promise.all([page.waitForSelector(SELECTORS.TOAST_MESSAGE), page.click(SELECTORS.TOS_LIGHTNING_INPUT)]);
      await page.waitForSelector(SELECTORS.TOAST_MESSAGE, { hidden: true });
    }
    await page.waitForSelector(SELECTORS.SALES_CLOUD_FOR_SLACK_TOGGLE, { visible: true });
    if (state.enableSalesCloudForSlack !== config.enableSalesCloudForSlack) {
      await Promise.all([
        page.waitForSelector(SELECTORS.TOAST_MESSAGE),
        page.click(SELECTORS.SALES_CLOUD_FOR_SLACK_TOGGLE)
      ]);
      await page.waitForSelector(SELECTORS.TOAST_MESSAGE, { hidden: true });
    }
    await page.close();
  }
}
