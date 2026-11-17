import assert from 'assert';
import {
  HighVelocitySalesSettingsConfig,
  HighVelocitySalesSettings,
  highVelocitySalesSettingsSchema,
} from './index.js';
import { AUTOMATION_TAB_ITEM, HighVelocitySalesSetupPage } from './page.js';
import { capture } from '../../../test/capture.js';

describe(HighVelocitySalesSettings.name, function () {
  let plugin: HighVelocitySalesSettings;
  before(() => {
    plugin = new HighVelocitySalesSettings(global.browserforce);
  });

  const configEnabled: HighVelocitySalesSettingsConfig = {
    setUpAndEnable: true,
  };
  const configDisabled = {
    setUpAndEnable: false,
  };

  it(
    'should enable @capture',
    capture(highVelocitySalesSettingsSchema, {
      config: { setUpAndEnable: true },
      pages: {
        screenshot: {
          clip: { x: 262, y: 520, width: 1168, height: 560 },
          height: 1300,
          async open(doc) {
            const page = await doc.open(HighVelocitySalesSetupPage.getUrl());
            await doc.click(page, AUTOMATION_TAB_ITEM);
            return page;
          },
          pills: { setUpAndEnable: 'button.setupAndEnableButton, #toggleHighVelocitySalesPref' },
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
