import { defineUseCases } from '../../../scripts/use-cases.js';
import { linkedInSalesNavigatorSettingsSchema } from './index.js';

export const useCases = defineUseCases(linkedInSalesNavigatorSettingsSchema, [
  {
    slug: '01-account-executives-research-buyers',
    title: 'Account executives research buyers without leaving Salesforce',
    given: { enabled: false },
    config: { enabled: true },
    story: [
      'The account executives of Fabrikam use LinkedIn Sales Navigator to find the decision makers of their prospects. They switch between the two tools all day, and the contacts they find never reach the CRM.',
      'Turning on the **Sales Navigator integration (1)** adds the Sales Navigator components to account, contact and lead pages, so reps see the buying committee and send InMails from the record. No Metadata API settings type holds this toggle, and turning it on also asks the admin to accept the terms of the integration: this config does both in every org of the team.',
    ],
    captures: {
      'linkedin-sales-navigator': {
        clip: { x: 256, y: 140, width: 1184, height: 800 },
      },
    },
    async shoot(doc) {
      await using page = await doc.open('/lightning/setup/LinkedInSalesNavigatorPage/home', { height: 1000 });
      const ui = await doc.within(
        page,
        'div[data-aura-class="setup_sales_linkedinLinkedInSetupRow"]:has(input[type="checkbox"]:not(:disabled)) label',
      );
      await doc.shot('linkedin-sales-navigator', page, {
        pills: {
          enabled: ui.locator(
            'div[data-aura-class="setup_sales_linkedinLinkedInSetupRow"]:has(input[type="checkbox"]:not(:disabled)) label',
          ),
        },
      });
    },
  },
]);
