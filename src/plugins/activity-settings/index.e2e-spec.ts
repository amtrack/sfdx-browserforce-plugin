import assert from 'assert';
import { ActivitySettings, activitySettingsSchema } from './index.js';
import { capture } from '../../../test/capture.js';

describe(ActivitySettings.name, function () {
  let plugin: ActivitySettings;
  before(() => {
    plugin = new ActivitySettings(global.browserforce);
  });

  describe('allowUsersToRelateMultipleContactsToTasksAndEvents', () => {
    const configEnabled = {
      allowUsersToRelateMultipleContactsToTasksAndEvents: true,
    };
    const configDisabled = {
      allowUsersToRelateMultipleContactsToTasksAndEvents: false,
    };

    it(
      'should enable @capture',
      capture(activitySettingsSchema, {
        config: { allowUsersToRelateMultipleContactsToTasksAndEvents: true },
        pages: {
          screenshot: {
            positions: { allowUsersToRelateMultipleContactsToTasksAndEvents: 'left' },
            context: ['.bPageTitle', '.bPageBlock'],
            pills: {
              allowUsersToRelateMultipleContactsToTasksAndEvents: 'input[id="thePage:theForm:theBlock:manyWhoPref"]',
            },
          },
        },
      }),
    );
    it('should be enabled', async () => {
      const res = await plugin.retrieve();
      assert.deepStrictEqual(res, configEnabled);
    });
    it('should fail to disable', async () => {
      let err;
      try {
        await plugin.apply(configDisabled);
      } catch (e) {
        err = e;
      }
      assert.throws(() => {
        throw err;
      }, /can only be disabled/);
    });
  });
});
