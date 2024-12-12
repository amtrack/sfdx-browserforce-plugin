import assert from 'assert';
import { LightningExperienceSettings } from './index.js';

describe(LightningExperienceSettings.name, function () {
  describe('activeThemeName', () => {
    let plugin: LightningExperienceSettings;
    before(() => {
      plugin = new LightningExperienceSettings(global.bf);
    });

    const configLightningLite = { activeThemeName: 'LightningLite' };
    const configLightning = { activeThemeName: 'Lightning' };
    it('should activate LightningLite theme', async () => {
      await plugin.run(configLightningLite);
    });
    it('LightningLite theme should already be activated', async () => {
      const state = await plugin.retrieve();
      assert.deepStrictEqual(state, configLightningLite);
    });
    it('should activate Lightning theme', async () => {
      await plugin.apply(configLightning);
    });
    it('Lightning theme should already be activated', async () => {
      const state = await plugin.retrieve();
      assert.deepStrictEqual(state, configLightning);
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
