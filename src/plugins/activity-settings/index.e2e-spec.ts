import * as assert from 'assert';
import * as child from 'child_process';
import * as path from 'path';
import ActivitySettings from '.';

describe(ActivitySettings.name, () => {
  it('should enable allowUsersToRelateMultipleContactsToTasksAndEvents', function() {
    this.timeout(1000 * 90);
    this.slow(1000 * 30);
    const enableManyWhoPrefCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'enable-manyWhoPref.json'))
    ]);
    assert.deepEqual(
      enableManyWhoPrefCmd.status,
      0,
      enableManyWhoPrefCmd.output.toString()
    );
    assert(
      /'allowUsersToRelateMultipleContactsToTasksAndEvents' to 'true'/.test(
        enableManyWhoPrefCmd.output.toString()
      ),
      enableManyWhoPrefCmd.output.toString()
    );
  });
  it('should already be enabled: allowUsersToRelateMultipleContactsToTasksAndEvents', function() {
    this.timeout(1000 * 90);
    this.slow(1000 * 30);
    const enableManyWhoPrefCmd2 = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'enable-manyWhoPref.json'))
    ]);
    assert.deepEqual(
      enableManyWhoPrefCmd2.status,
      0,
      enableManyWhoPrefCmd2.output.toString()
    );
    assert(
      /no action necessary/.test(enableManyWhoPrefCmd2.output.toString()),
      enableManyWhoPrefCmd2.output.toString()
    );
  });
  it('should fail to disable allowUsersToRelateMultipleContactsToTasksAndEvents', function() {
    this.timeout(1000 * 90);
    this.slow(1000 * 30);
    const disableManyWhoPrefCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'disable-manyWhoPref.json'))
    ]);
    assert.deepEqual(
      disableManyWhoPrefCmd.status,
      1,
      disableManyWhoPrefCmd.output.toString()
    );
    assert(
      /'allowUsersToRelateMultipleContactsToTasksAndEvents' to 'false'/.test(
        disableManyWhoPrefCmd.output.toString()
      ),
      disableManyWhoPrefCmd.output.toString()
    );
    assert(
      /can only be disabled/.test(disableManyWhoPrefCmd.output.toString()),
      disableManyWhoPrefCmd.output.toString()
    );
  });
});
