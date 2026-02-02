import assert from 'assert';
import { EinsteinBots } from './index.js';

describe(EinsteinBots.name, function () {
  this.timeout('10m');
  let plugin: EinsteinBots;
  before(() => {
    plugin = new EinsteinBots(global.browserforce);
  });

  const configEnabled = {
    enabled: true,
  };
  const configDisabled = {
    enabled: false,
  };

  it('should enable Einstein Bots', async () => {
    await plugin.run(configEnabled);
  });

  it('should verify Einstein Bots is enabled', async () => {
    const res = await plugin.retrieve();
    assert.deepStrictEqual(res, configEnabled);
  });

  it('should disable Einstein Bots', async () => {
    await plugin.run(configDisabled);
  });

  it('should verify Einstein Bots is disabled', async () => {
    const res = await plugin.retrieve();
    assert.deepStrictEqual(res, configDisabled);
  });
});

