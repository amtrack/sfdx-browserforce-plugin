import assert from 'assert';
import { EinsteinConversationInsights, type EinsteinConversationInsightsConfig } from './index.js';

describe(EinsteinConversationInsights.name, function () {
  this.timeout('15m');
  this.slow('1m');
  let plugin: EinsteinConversationInsights;
  before(() => {
    plugin = new EinsteinConversationInsights(global.browserforce);
  });

  const configEnabled: EinsteinConversationInsightsConfig = {
    enabled: true,
  };
  const configDisabled: EinsteinConversationInsightsConfig = {
    enabled: false,
  };
  // enabling, with its screenshots: the first test of CallSummaries, which needs it (the tests run in the order of
  // their files, and Conversation Insights cannot be turned off again)
  it('should enable', async () => {
    await plugin.run(configEnabled);
  });
  it('should already be enabled', async () => {
    const res = await plugin.run(configEnabled);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
  it('should fail to disable', async () => {
    let err;
    try {
      await plugin.run(configDisabled);
    } catch (e) {
      err = e;
    }
    assert.throws(() => {
      throw err;
    }, /cannot be disabled/);
  });
});
