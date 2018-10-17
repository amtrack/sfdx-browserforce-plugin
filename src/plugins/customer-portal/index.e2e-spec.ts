import * as assert from 'assert';
import * as child from 'child_process';
import * as path from 'path';
import CustomerPortal from '.';

describe(CustomerPortal.name, () => {
  it('should enable', function() {
    this.timeout(1000 * 60);
    this.slow(1000 * 15);
    const enableCmd = child.spawnSync('sfdx', [
      'browserforce:shape:apply',
      '-f',
      path.resolve(path.join(__dirname, 'enable.json'))
    ]);
    assert.deepEqual(enableCmd.status, 0, enableCmd.stderr);
    assert(/to 'true'/.test(enableCmd.stderr.toString()));
  });
  it('should fail to disable', function() {
    this.timeout(1000 * 60);
    this.slow(1000 * 15);
    const disableCmd = child.spawnSync('sfdx', [
      'browserforce:shape:apply',
      '-f',
      path.resolve(path.join(__dirname, 'disable.json'))
    ]);
    assert.deepEqual(disableCmd.status, 0, disableCmd.stderr);
    assert(/to 'false'/.test(disableCmd.stderr.toString()));
    assert(/cannot be disabled/.test(disableCmd.stderr.toString()));
  });
});
