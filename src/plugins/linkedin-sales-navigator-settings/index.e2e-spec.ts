import assert from 'assert';
import { Config, LinkedInSalesNavigatorSettings } from './index.js';

describe(LinkedInSalesNavigatorSettings.name, function () {
  let plugin: LinkedInSalesNavigatorSettings;
  before(() => {
    plugin = new LinkedInSalesNavigatorSettings(global.bf);
  });

  const configEnabled: Config = {
    enabled: true
  };
  const configDisabled: Config = {
    enabled: false
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
