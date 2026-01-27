import assert from 'assert';
import { type Config, Slack } from './index.js';

describe(Slack.name, function () {
  let plugin: Slack;
  before(() => {
    plugin = new Slack(global.browserforce);
  });

  const configEnable: Config = {
    agreeToTermsAndConditions: true,
    enableSalesCloudForSlack: true,
  };
  const configDisabledSalesCloud: Config = {
    agreeToTermsAndConditions: true,
    enableSalesCloudForSlack: false,
  };
  const configDisabled: Config = {
    agreeToTermsAndConditions: false,
    enableSalesCloudForSlack: false,
  };
  it('should accept terms and conditions and enable Sales Cloud for Slack', async () => {
    await plugin.run(configEnable);
  });
  it('should already be accepted and enabled', async () => {
    const res = await plugin.run(configEnable);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
  it('should disable Sales Cloud for Slack', async () => {
    await plugin.run(configDisabledSalesCloud);
  });
  it('should already be disabled', async () => {
    const res = await plugin.run(configDisabledSalesCloud);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
  it('should fail to unaccept terms and conditions', async () => {
    let err;
    try {
      await plugin.apply(configDisabled);
    } catch (e) {
      err = e;
    }
    assert.throws(() => {
      throw err;
    }, /cannot be unaccepted/);
  });
});
