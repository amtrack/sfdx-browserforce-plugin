import assert from 'assert';
import { OmniChannelSettings, omniChannelSettingsSchema, STATUS_CAPACITY_TOGGLE_SELECTOR } from './index.js';
import { capture } from '../../../test/capture.js';

describe(OmniChannelSettings.name, function () {
  this.timeout('10m');
  let plugin: OmniChannelSettings;
  before(() => {
    plugin = new OmniChannelSettings(global.browserforce);
  });

  const configEnableStatusBasedCapacityModel = {
    enableStatusBasedCapacityModel: true,
  };
  const configDisableStatusBasedCapacityModel = {
    enableStatusBasedCapacityModel: false,
  };

  it(
    'should enable status based capacity model @capture',
    capture(omniChannelSettingsSchema, {
      config: { enableStatusBasedCapacityModel: true },
      pages: {
        screenshot: {
          context: ['.bPageTitle', '.bPageBlock'],
          pills: { enableStatusBasedCapacityModel: STATUS_CAPACITY_TOGGLE_SELECTOR },
        },
      },
    }),
  );

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
