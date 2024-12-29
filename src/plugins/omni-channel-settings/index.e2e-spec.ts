import assert from 'assert';
import { OmniChannelSettings } from './index.js';

describe(OmniChannelSettings.name, function () {
  this.timeout('10m');
  let plugin: OmniChannelSettings;
  before(() => {
    plugin = new OmniChannelSettings(global.bf);
  });

  const configEnableStatusBasedCapacityModel = {
    enableStatusBasedCapacityModel: true
  };
  const configDisableStatusBasedCapacityModel = {
    enableStatusBasedCapacityModel: false
  };

  it('should enable status based capacity model', async () => {
    await plugin.run(configEnableStatusBasedCapacityModel);
  });
  it('should already be set to true', async () => {
    const res = await plugin.retrieve();
    assert.deepStrictEqual(res, configEnableStatusBasedCapacityModel);
  });

  it('should disable status based capacity model', async () => {
    await plugin.run(configDisableStatusBasedCapacityModel);
  });
  it('should already be set to false', async () => {
    const res = await plugin.retrieve();
    assert.deepStrictEqual(res, configDisableStatusBasedCapacityModel);
  });
});
