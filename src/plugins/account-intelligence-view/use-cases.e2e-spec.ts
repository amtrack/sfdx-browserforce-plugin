import { defineUseCases } from '../../../scripts/use-cases.js';
import { accountIntelligenceViewSchema } from './index.js';

export const useCases = defineUseCases(accountIntelligenceViewSchema, [
  {
    slug: '01-account-managers-see-their-portfolio',
    title: 'Account managers review their whole portfolio in one view',
    given: { enable: false },
    config: { enable: true },
    story: [
      'Northwind Traders runs quarterly account reviews: each account manager walks through the activity, open opportunities and cases of the accounts they own. Opening the accounts one by one takes hours, so the sales operations team wants the Account Intelligence view, a list of accounts with their key metrics and recent changes side by side.',
      'The view is switched on by the **Account Intelligence toggle (1)** in Setup. The Metadata API cannot do it: `AccountIntelligenceSettings` only holds the logos, news and automated fields of the accounts, not this toggle. With this config, every new sandbox and scratch org of the sales team gets the view, so the reviews can be rehearsed and the related customizations tested before they reach production.',
    ],
    captures: {
      'account-intelligence': {
        clip: { x: 256, y: 140, width: 1184, height: 620 },
      },
    },
    async shoot(doc) {
      await using page = await doc.open('/lightning/setup/AccountInspectionSettings/home');
      const ui = await doc.within(page, 'lightning-input.pipelineInspectionToggle');
      await doc.shot('account-intelligence', page, {
        pills: { enable: ui.locator('lightning-input.pipelineInspectionToggle') },
      });
    },
  },
]);
