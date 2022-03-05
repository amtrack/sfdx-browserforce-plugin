import assert from 'assert';
import * as child from 'child_process';
import * as path from 'path';
import { ActivitySettings } from '.';

describe(ActivitySettings.name, function() {
  this.slow('30s');
  this.timeout('2m');
  it('should enable allowUsersToRelateMultipleContactsToTasksAndEvents', () => {
    const enableManyWhoPrefCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'enable-many-who-pref.json'))
    ]);
    assert.deepStrictEqual(
      enableManyWhoPrefCmd.status,
      0,
      enableManyWhoPrefCmd.output.toString()
    );
    assert.ok(
      /'allowUsersToRelateMultipleContactsToTasksAndEvents' to 'true'/.test(
        enableManyWhoPrefCmd.output.toString()
      ),
      enableManyWhoPrefCmd.output.toString()
    );
  });
  it('should already be enabled: allowUsersToRelateMultipleContactsToTasksAndEvents', () => {
    const enableManyWhoPrefCmd2 = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'enable-many-who-pref.json'))
    ]);
    assert.deepStrictEqual(
      enableManyWhoPrefCmd2.status,
      0,
      enableManyWhoPrefCmd2.output.toString()
    );
    assert.ok(
      /no action necessary/.test(enableManyWhoPrefCmd2.output.toString()),
      enableManyWhoPrefCmd2.output.toString()
    );
  });
  it('should fail to disable allowUsersToRelateMultipleContactsToTasksAndEvents', () => {
    const disableManyWhoPrefCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'disable-many-who-pref.json'))
    ]);
    assert.deepStrictEqual(
      disableManyWhoPrefCmd.status,
      1,
      disableManyWhoPrefCmd.output.toString()
    );
    assert.ok(
      /'allowUsersToRelateMultipleContactsToTasksAndEvents' to 'false'/.test(
        disableManyWhoPrefCmd.output.toString()
      ),
      disableManyWhoPrefCmd.output.toString()
    );
    assert.ok(
      /can only be disabled/.test(disableManyWhoPrefCmd.output.toString()),
      disableManyWhoPrefCmd.output.toString()
    );
  });
});
