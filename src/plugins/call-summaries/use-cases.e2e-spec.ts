import { defineUseCases } from '../../../scripts/use-cases.js';
import { einsteinConversationInsightsSchema } from '../einstein-conversation-insights/index.js';
import { callSummariesSchema } from './index.js';
import { GET_STARTED_BUTTON, ON_BADGE, TURN_ON_BUTTON } from './page.js';

const ENABLEMENT_PANEL = 'setup_discovery-feature-enablement-panel';

export const useCases = defineUseCases(callSummariesSchema, [
  {
    slug: '01-summaries-of-the-sales-calls',
    title: 'Summarize the sales calls with generative AI',
    given: { enabled: false },
    config: { enabled: true },
    story: [
      'The managers of Tailspin Toys no longer have time to listen to the recorded calls of their reps: they want Einstein to write a summary of each call, with its next steps and the feedback of the customer. Deploying `ConversationalIntelligenceSettings` with `enableCallSummarization` often fails with `OrgPreferences.GenECI`, and even when the setting reads `true`, the object that stores the summaries may not exist yet.',
      'With `enabled: true`, Browserforce clicks **Turn On (1)** in Setup > Salesforce Go > Call Summaries and waits until Salesforce has created that object. Einstein Conversation Insights must be on first, which the `einsteinConversationInsights` setting does. `enabled: false` turns the setting off through the Metadata API.',
    ],
    captures: {
      // the title of the page and the whole panel, not cut at its left border
      'call-summaries': { clip: { x: 256, y: 150, width: 1184, height: 550 } },
    },
    async prepare(doc) {
      await doc.apply(einsteinConversationInsightsSchema, { enabled: true });
    },
    async shoot(doc) {
      await using page = await doc.open('/lightning/setup/page/feature/sales-cloud-call-summaries/home', {
        height: 900,
      });
      if (doc.state === 'before') {
        // the steps to turn it on only show after Get Started, which changes nothing
        await doc.click(page, GET_STARTED_BUTTON);
      }
      const ui = await doc.within(page, doc.state === 'before' ? TURN_ON_BUTTON : ON_BADGE);
      await doc.shot('call-summaries', page, {
        context: [ui.locator(ENABLEMENT_PANEL)],
        pills: { enabled: ui.locator(TURN_ON_BUTTON).or(ui.locator(ON_BADGE)) },
      });
    },
  },
]);
