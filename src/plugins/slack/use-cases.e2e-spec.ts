import { defineUseCases } from '../../../scripts/use-cases.js';
import { slackSchema, TOS_CHECKBOX_TOGGLE } from './index.js';

export const useCases = defineUseCases(slackSchema, [
  {
    slug: '01-sales-team-works-deals-in-slack',
    title: 'The sales team works its deals from Slack',
    given: { enableSalesCloudForSlack: false },
    config: { agreeToTermsAndConditions: true, enableSalesCloudForSlack: true },
    story: [
      'The account executives of Trey Research spend their day in Slack, and update their opportunities in Salesforce at the end of the week, if at all. Sales operations wants them to look up and update records, and get deal alerts, without leaving Slack, with the Sales Cloud for Slack app.',
      'Before any Slack app can connect to the org, an admin must **accept the terms and conditions (1)** of the Slack integration, then turn on **Sales Cloud for Slack (2)**. No Metadata API type holds either toggle, and the terms can never be declined again once accepted: this config does both in each new org, so the Slack workspace of the sandbox can be connected right after it is created.',
    ],
    captures: {
      'slack-apps-setup': {
        clip: { x: 262, y: 650, width: 1166, height: 440 },
      },
    },
    async shoot(doc) {
      await using page = await doc.open('/lightning/setup/SlackSetupAssistant/home', { height: 1400 });
      const ui = await doc.within(page, TOS_CHECKBOX_TOGGLE);
      await doc.shot('slack-apps-setup', page, {
        pills: {
          agreeToTermsAndConditions: ui.locator(TOS_CHECKBOX_TOGGLE),
          enableSalesCloudForSlack: ui.locator(
            'lightning-primitive-input-toggle:has(input[type="checkbox"][name="SlkSetupStepSalesCloudForSlack"])',
          ),
        },
      });
    },
  },
]);
