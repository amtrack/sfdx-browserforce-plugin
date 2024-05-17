import assert from 'assert';
import { ActivitySettings } from '.';

describe(ActivitySettings.name, function () {
  let plugin: ActivitySettings;
  before(() => {
    plugin = new ActivitySettings(global.bf);
  });

  describe('allowUsersToRelateMultipleContactsToTasksAndEvents', () => {
    const configEnabled = {
      allowUsersToRelateMultipleContactsToTasksAndEvents: true
    };
    const configDisabled = {
      allowUsersToRelateMultipleContactsToTasksAndEvents: false
    };

    it('should enable', async () => {
      await plugin.run(configEnabled);
    });
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
