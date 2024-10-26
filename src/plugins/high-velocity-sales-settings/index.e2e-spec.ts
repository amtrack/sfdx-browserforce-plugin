import assert from 'assert';
import { Config, HighVelocitySalesSettings } from './index.js';

describe(HighVelocitySalesSettings.name, function () {
  let plugin: HighVelocitySalesSettings;
  before(() => {
    plugin = new HighVelocitySalesSettings(global.bf);
  });

  const configEnabled: Config = {
    setUpAndEnable: true
  };
  const configDisabled = {
    setUpAndEnable: false
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
