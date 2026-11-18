import assert from 'assert';
import { DensitySettings, densitySettingsSchema } from './index.js';
import { capture } from '../../../test/capture.js';

type DensitySettingsConfig = Awaited<ReturnType<DensitySettings['retrieve']>>;

describe(DensitySettings.name, function () {
  let plugin: DensitySettings;
  before(() => {
    plugin = new DensitySettings(global.browserforce);
  });

  const configComfy: DensitySettingsConfig = {
    density: 'Comfy',
  };
  const configCompact = { density: 'Compact' };

  it(
    'should set to Compact @capture',
    capture(densitySettingsSchema, {
      config: { density: 'Compact' },
      pages: {
        screenshot: {
          context: ['one-density-visual-picker'],
          pills: {
            density: 'one-density-visual-picker-item:has(input[name="options"][value="Compact"]) label',
          },
        },
      },
    }),
  );
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
});
