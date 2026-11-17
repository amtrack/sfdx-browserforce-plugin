import assert from 'assert';
import {
  LinkedInSalesNavigatorSettingsConfig,
  LinkedInSalesNavigatorSettings,
  linkedInSalesNavigatorSettingsSchema,
} from './index.js';
import { capture } from '../../../test/capture.js';

describe(LinkedInSalesNavigatorSettings.name, function () {
  let plugin: LinkedInSalesNavigatorSettings;
  before(() => {
    plugin = new LinkedInSalesNavigatorSettings(global.browserforce);
  });

  const configEnabled: LinkedInSalesNavigatorSettingsConfig = {
    enabled: true,
  };
  const configDisabled: LinkedInSalesNavigatorSettingsConfig = {
    enabled: false,
  };

  it(
    'should enable @capture',
    capture(linkedInSalesNavigatorSettingsSchema, {
      config: { enabled: true },
      pages: {
        screenshot: {
          clip: { x: 256, y: 140, width: 1184, height: 800 },
          height: 1000,
          pills: {
            enabled:
              'div[data-aura-class="setup_sales_linkedinLinkedInSetupRow"]:has(input[type="checkbox"]:not(:disabled)) label',
          },
        },
      },
    }),
  );
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
