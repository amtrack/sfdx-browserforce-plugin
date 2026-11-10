import { defineUseCases } from '../../../scripts/use-cases.js';
import { AUTOMATION_TAB_ITEM } from './page.js';
import { highVelocitySalesSettingsSchema } from './index.js';

export const useCases = defineUseCases(highVelocitySalesSettingsSchema, [
  {
    slug: '01-sales-development-team-cadences',
    title: 'A sales development team starts working with cadences',
    given: { setUpAndEnable: false },
    config: { setUpAndEnable: true },
    story: [
      "Contoso hires a team of sales development reps who call and email new leads following cadences: a sequence of steps with a work queue telling each rep who to contact next. Cadences and work queues come with Sales Engagement (formerly High Velocity Sales), and the team's developers already describe its options in `HighVelocitySalesSettings` metadata.",
      'That metadata cannot turn the feature on for the first time: Salesforce requires a click on **Set Up and Enable Sales Engagement (1)** in Setup, which then shows the toggle of the feature. This config clicks it in every new org, so the deployment of the cadences and of the settings that follow works without a manual step.',
    ],
    captures: {
      'sales-engagement': {
        clip: { x: 262, y: 520, width: 1168, height: 560 },
      },
    },
    async shoot(doc) {
      await using page = await doc.open('/lightning/setup/SalesEngagement/home', { height: 1300 });
      await doc.click(page, AUTOMATION_TAB_ITEM);
      const ui = await doc.within(page, 'button.setupAndEnableButton, #toggleHighVelocitySalesPref');
      await doc.shot('sales-engagement', page, {
        pills: { setUpAndEnable: ui.locator('button.setupAndEnableButton, #toggleHighVelocitySalesPref') },
      });
    },
  },
]);
