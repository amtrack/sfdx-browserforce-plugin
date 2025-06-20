import { BrowserforcePlugin } from '../../plugin.js';

const BASE_PATH = 'lightning/setup/SlackSetupAssistant/home';

const TOS_LWC = 'setup_service-slack-agree-to-terms lightning-input';
const TOS_CHECKBOX = `${TOS_LWC} input[type="checkbox"]`;
const SALES_CLOUD_FOR_SLACK_CHECKBOX =
  'input[type="checkbox"][name="SlkSetupStepSalesCloudForSlack"]';
const SALES_CLOUD_FOR_SLACK__LWC = `lightning-input:has(${SALES_CLOUD_FOR_SLACK_CHECKBOX})`;
const TOAST_MESSAGE = 'div[id^="toastDescription"]';

export type Config = {
  agreeToTermsAndConditions: boolean;
  enableSalesCloudForSlack: boolean;
};

export class Slack extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const page = await this.browserforce.openPage(BASE_PATH);
    await waitForSettingsResponse(page);
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
    const page = await this.browserforce.openPage(BASE_PATH);
    await waitForSettingsResponse(page);
    if (state.agreeToTermsAndConditions !== config.agreeToTermsAndConditions) {
      await Promise.all([
        page.locator(TOAST_MESSAGE).wait(),
        page.locator(TOS_LWC).click(),
      ]);
      await page.waitForSelector(TOAST_MESSAGE, { hidden: true });
    }
    if (state.enableSalesCloudForSlack !== config.enableSalesCloudForSlack) {
      await Promise.all([
        page.locator(TOAST_MESSAGE).wait(),
        page.locator(SALES_CLOUD_FOR_SLACK__LWC).click(),
      ]);
      await page.waitForSelector(TOAST_MESSAGE, { hidden: true });
    }
    await page.close();
  }
}

async function waitForSettingsResponse(page) {
  await page
    .waitForResponse((response) => {
      return (
        response.url().includes('SlackSalesApp.getSlackBetaTOSPref=1') &&
        response.ok()
      );
    })
    .catch((e) => {
      throw new Error('Timed out waiting for response to get Slack settings', {
        cause: e,
      });
    });
}
