import assert from 'assert';
import { AccountIntelligenceView, type AccountIntelligenceViewConfig } from './index.js';

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

  it('should enable', async () => {
    await plugin.run(configEnabled);
  });
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
