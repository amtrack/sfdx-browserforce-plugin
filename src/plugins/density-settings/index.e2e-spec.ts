import assert from 'assert';
import { DensitySettings } from './index.js';

type Config = Awaited<ReturnType<DensitySettings['retrieve']>>;

describe(DensitySettings.name, function () {
  let plugin: DensitySettings;
  before(() => {
    plugin = new DensitySettings(global.bf);
  });

  const configComfy: Config = {
    density: 'Comfy',
  };
  const configCompact = { density: 'Compact' };

  it('should set to Compact', async () => {
    await plugin.run(configCompact);
  });
  it('should be set to Compact', async () => {
    const res = await plugin.retrieve();
    assert.deepStrictEqual(res, configCompact);
  });
  it('should set to Comfy', async () => {
    await plugin.apply(configComfy);
  });
  it('should be set to Comfy', async () => {
    const res = await plugin.retrieve();
    assert.deepStrictEqual(res, configComfy);
  });
  it('should throw for invalid density', async () => {
    let err;
    try {
      await plugin.run({ density: 'Foo' });
    } catch (e) {
      err = e;
    }
    assert.throws(() => {
      throw err;
    }, /Could not find density/);
  });
});
