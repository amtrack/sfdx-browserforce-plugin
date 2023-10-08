import assert from 'assert';
import { HighVelocitySalesSettings } from '.';

describe(HighVelocitySalesSettings.name, function () {
  let plugin;
  before(() => {
    plugin = new HighVelocitySalesSettings(global.bf);
  });

  const configEnabled = {
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
