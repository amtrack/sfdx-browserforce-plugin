import assert from 'assert';
import { AccountIntelligenceView, type AccountIntelligenceViewConfig, accountIntelligenceViewSchema } from './index.js';
import { capture } from '../../../test/capture.js';

describe(AccountIntelligenceView.name, function () {
  let plugin: AccountIntelligenceView;
  before(() => {
    plugin = new AccountIntelligenceView(global.browserforce);
  });

  const configEnabled: AccountIntelligenceViewConfig = {
    enable: true,
  };
  const configDisabled: AccountIntelligenceViewConfig = {
    enable: false,
  };

  it(
    'should enable @capture',
    capture(accountIntelligenceViewSchema, {
      config: { enable: true },
      pages: {
        screenshot: {
          clip: { x: 256, y: 140, width: 1184, height: 620 },
          pills: { enable: 'lightning-input.pipelineInspectionToggle' },
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
