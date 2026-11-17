import assert from 'assert';
import { type SlackConfig, Slack, slackSchema, TOS_CHECKBOX_TOGGLE } from './index.js';
import { capture } from '../../../test/capture.js';

describe(Slack.name, function () {
  let plugin: Slack;
  before(() => {
    plugin = new Slack(global.browserforce);
  });

  const configEnable: SlackConfig = {
    agreeToTermsAndConditions: true,
    enableSalesCloudForSlack: true,
  };
  const configDisabledSalesCloud: SlackConfig = {
    agreeToTermsAndConditions: true,
    enableSalesCloudForSlack: false,
  };
  const configDisabled: SlackConfig = {
    agreeToTermsAndConditions: false,
    enableSalesCloudForSlack: false,
  };
  it(
    'should accept terms and conditions and enable Sales Cloud for Slack @capture',
    capture(slackSchema, {
      config: { agreeToTermsAndConditions: true, enableSalesCloudForSlack: true },
      pages: {
        screenshot: {
          clip: { x: 262, y: 650, width: 1166, height: 440 },
          height: 1400,
          pills: {
            agreeToTermsAndConditions: TOS_CHECKBOX_TOGGLE,
            enableSalesCloudForSlack:
              'lightning-primitive-input-toggle:has(input[type="checkbox"][name="SlkSetupStepSalesCloudForSlack"])',
          },
        },
      },
    }),
  );
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
