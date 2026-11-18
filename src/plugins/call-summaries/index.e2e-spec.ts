import assert from 'assert';
import { CallSummaries, type CallSummariesConfig, callSummariesSchema } from './index.js';
import { einsteinConversationInsightsSchema } from '../einstein-conversation-insights/index.js';
import { CallSummariesSetupPage, GET_STARTED_BUTTON, TURN_ON_BUTTON } from './page.js';
import { capture } from '../../../test/capture.js';

const ENABLEMENT_PANEL = 'setup_discovery-feature-enablement-panel';

// the toggle of the first step, shown once it is on
const TURN_ON_TOGGLE =
  '.slds-setup-assistant__step-summary:has(h3:text-is("Turn On Conversation Insights")) lightning-input';

describe(CallSummaries.name, function () {
  this.timeout('45m');
  this.slow('1m');
  let plugin: CallSummaries;
  before(() => {
    plugin = new CallSummaries(global.browserforce);
  });

  const configEnabled: CallSummariesConfig = {
    enabled: true,
  };
  const configDisabled: CallSummariesConfig = {
    enabled: false,
  };
  // the use case of einsteinConversationInsights: it needs an org where Conversation Insights is still off
  it(
    'should turn on Einstein Conversation Insights as a prerequisite @capture',
    capture(einsteinConversationInsightsSchema, {
      config: { enabled: true },
      pages: {
        screenshot: {
          open: (doc) => doc.open('/lightning/setup/CallCoachingSettings/home'),
          context: ['h2.title-header'],
          pills: { enabled: TURN_ON_TOGGLE },
        },
      },
    }),
  );
  it(
    'should enable @capture',
    capture(callSummariesSchema, {
      config: { enabled: true },
      // the Turn On button the story cites
      screenshot: 'before',
      pages: {
        screenshot: {
          async open(doc) {
            const page = await doc.open(CallSummariesSetupPage.getUrl());
            // the steps to turn it on only show after Get Started, which changes nothing
            await doc.click(page, GET_STARTED_BUTTON);
            return page;
          },
          context: [ENABLEMENT_PANEL],
          pills: { enabled: TURN_ON_BUTTON },
        },
      },
    }),
  );
  it('should already be enabled', async () => {
    const res = await plugin.run(configEnabled);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
  it('should disable', async () => {
    await plugin.run(configDisabled);
  });
  it('should already be disabled', async () => {
    const res = await plugin.run(configDisabled);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
});
