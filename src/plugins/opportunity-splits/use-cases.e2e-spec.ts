import { defineUseCases } from '../../../scripts/use-cases.js';
import { opportunitySplitsSchema } from './index.js';

export const useCases = defineUseCases(opportunitySplitsSchema, [
  {
    slug: '01-credit-shared-deals',
    title: 'Sales reps share the credit of the deals they close together',
    given: { enabled: false },
    config: { enabled: true },
    story: [
      'At Adventure Works, an account executive and a solution engineer often close a deal together, and the commission plan pays each of them a share of its revenue. Sales operations tracks those shares in a spreadsheet next to the CRM, and the quarterly commission run is always late.',
      'Opportunity Splits stores the shares on the opportunity itself. The Metadata API cannot turn it on (`OpportunitySettings` only has `enableOpportunityTeam`), and Setup does it with a wizard: enable the feature, confirm the recalculation of the existing opportunities, then choose the page layouts that get the splits related list. This config runs the whole wizard, from **Set Up Opportunity Splits (1)** to the default split types Revenue and Overlay, once Opportunity Teams are on (deploy the `Opportunity` settings with `enableOpportunityTeam` first, as the fixture of this plugin does).',
    ],
    captures: {
      'opportunity-splits': {
        clip: { x: 240, y: 130, width: 1180, height: 530 },
      },
    },
    async shoot(doc) {
      await using page = await doc.open('/opp/opportunitySplitSetupOverview.apexp?setupid=OpportunitySplitSetup');
      const ui = await doc.within(page, 'input[value="Set Up Opportunity Splits"], table[id$=":splitTypeViewTable"]');
      await doc.shot('opportunity-splits', page, {
        pills: { enabled: ui.locator('input[value="Set Up Opportunity Splits"], table[id$=":splitTypeViewTable"]') },
      });
    },
  },
]);
