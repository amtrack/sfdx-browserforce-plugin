import assert from 'assert';
import { LightningExperienceSettings } from './index.js';

describe(LightningExperienceSettings.name, function () {
  describe('activeThemeName', () => {
    let plugin: LightningExperienceSettings;
    let configOriginal;
    before(async () => {
      plugin = new LightningExperienceSettings(global.bf);
      configOriginal = await plugin.retrieve();
    });

    const configLightningLite = { activeThemeName: 'LightningLite' };
    it('should activate LightningLite theme', async () => {
      await plugin.run(configLightningLite);
    });
    it('LightningLite theme should already be activated', async () => {
      const state = await plugin.retrieve();
      assert.deepStrictEqual(state, configLightningLite);
    });
    it('should activate original theme', async () => {
      await plugin.apply(configOriginal);
    });
    it('original theme should already be activated', async () => {
      const state = await plugin.retrieve();
      assert.deepStrictEqual(state, configOriginal);
    });
    it('should throw for invalid theme', async () => {
      let err;
      try {
        await plugin.run({ activeThemeName: 'Foo' });
      } catch (e) {
        err = e;
      }
      assert.throws(() => {
        throw err;
      }, /Could not find theme/);
    });
  });
});
