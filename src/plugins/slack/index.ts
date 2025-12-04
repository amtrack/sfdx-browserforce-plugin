import type { Page } from 'playwright';
import { BrowserforcePlugin } from '../../plugin.js';

const BASE_PATH = 'lightning/setup/SlackSetupAssistant/home';

const SALES_CLOUD_FOR_SLACK_CHECKBOX =
  'input[type="checkbox"][name="SlkSetupStepSalesCloudForSlack"]';

export type Config = {
  agreeToTermsAndConditions: boolean;
  enableSalesCloudForSlack: boolean;
};

export class Slack extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const page = await this.browserforce.openPage(BASE_PATH);
    await waitForFinalPage(page);
    const response = {
      agreeToTermsAndConditions: await page
        .locator('setup_service-slack-agree-to-terms input[type="checkbox"]')
        .isChecked(),
      enableSalesCloudForSlack: await page
        .locator(SALES_CLOUD_FOR_SLACK_CHECKBOX)
        .isChecked(),
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
    await waitForFinalPage(page);
    if (state.agreeToTermsAndConditions !== config.agreeToTermsAndConditions) {
      await Promise.all([
        page.waitForResponse(/handleSlackSalesAppPrefToggle=1/),
        page
          .locator(
            'setup_service-slack-agree-to-terms lightning-primitive-input-toggle'
          )
          .click(),
      ]);
    }
    if (state.enableSalesCloudForSlack !== config.enableSalesCloudForSlack) {
      await Promise.all([
        page.waitForResponse(/handleSlackSalesAppPrefToggle=1/),
        page
          .locator(
            `lightning-primitive-input-toggle:has(${SALES_CLOUD_FOR_SLACK_CHECKBOX})`
          )
          .click(),
      ]);
    }
    await page.close();
  }
}
/**
 * Due to some page redirects related to the salesforce-setup.com domain,
 * wait for all search params to disappear (?SetupDomainReload=1&SetupDomainProbePassed=true)
 * @param page
 */
async function waitForFinalPage(page: Page) {
  await page.waitForURL((url) => new URL(url).searchParams.size === 0);
}
