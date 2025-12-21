import assert from 'assert';
import { OmniChannelSettings } from './index.js';

describe(OmniChannelSettings.name, function () {
  this.timeout('10m');
  let plugin: OmniChannelSettings;
  before(() => {
    plugin = new OmniChannelSettings(global.bf);
  });

  const configEnableStatusBasedCapacityModel = {
    enableStatusBasedCapacityModel: true,
  };
  const configDisableStatusBasedCapacityModel = {
    enableStatusBasedCapacityModel: false,
  };

  it('should enable status based capacity model', async () => {
    await plugin.run(configEnableStatusBasedCapacityModel);
  });

  it('should verify status based capacity model is enabled', async () => {
    const res = await plugin.retrieve();
    assert.deepStrictEqual(res, configEnableStatusBasedCapacityModel);
  });

  it('should disable status based capacity model', async () => {
    await plugin.run(configDisableStatusBasedCapacityModel);
  });

  it('should verify status based capacity model is disabled', async () => {
    const res = await plugin.retrieve();
    assert.deepStrictEqual(res, configDisableStatusBasedCapacityModel);
  });
});
