import { defineUseCases } from '../../../scripts/use-cases.js';
import { einsteinConversationInsightsSchema } from './index.js';

// shown while Einstein Conversation Insights is off
const ENABLE_BUTTON = 'button.enableEci';
// the toggle of the first step, shown once it is on
const TURN_ON_TOGGLE =
  '.slds-setup-assistant__step-summary:has(h3:text-is("Turn On Conversation Insights")) lightning-input';

export const useCases = defineUseCases(einsteinConversationInsightsSchema, [
  {
    slug: '01-turn-on-in-a-pipeline',
    title: 'Turn on Conversation Insights in every new org of a pipeline',
    config: { enabled: true },
    story: [
      'Tailspin Toys records the sales calls of its reps, and every new scratch org of the sales team needs Einstein Conversation Insights before Call Summaries and the recording providers can be set up. A deployment of `ConversationalIntelligenceSettings` with `enableCallCoaching` returns as soon as the setting is saved, while Salesforce goes on turning the feature on in the background, sometimes for more than 30 minutes: a step that needs its objects right after the deployment fails.',
      'With `enabled: true`, Browserforce turns on **Conversation Insights (1)** through the Metadata API, then waits until Salesforce has created the objects that store the conversations. The page can show the readiness as in progress for a while longer: the `callSummaries` setting waits for it. Conversation Insights cannot be turned off again.',
    ],
    captures: {
      // down to the readiness of the feature in "After"
      'conversation-insights': { clip: { x: 262, y: 250, width: 1166, height: 470 } },
    },
    async shoot(doc) {
      await using page = await doc.open('/lightning/setup/CallCoachingSettings/home', { height: 900 });
      const ui = await doc.within(page, doc.state === 'before' ? ENABLE_BUTTON : TURN_ON_TOGGLE);
      await doc.shot('conversation-insights', page, {
        context: [ui.locator('h2.title-header')],
        pills: { enabled: ui.locator(ENABLE_BUTTON).or(ui.locator(TURN_ON_TOGGLE)) },
      });
    },
  },
]);
