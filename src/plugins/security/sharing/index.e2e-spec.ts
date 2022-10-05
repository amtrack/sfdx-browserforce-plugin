import assert from 'assert';
import * as child from 'child_process';
import * as path from 'path';
import { Sharing } from '.';

describe.skip(Sharing.name, function() {
  this.slow('30s');
  this.timeout('2m');
  it('should enable', () => {
    const enableCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'enable.json'))
    ]);
    assert.deepStrictEqual(enableCmd.status, 0, enableCmd.output.toString());
    assert.ok(
      /to '{"enableExternalSharingModel":true}'/.test(
        enableCmd.output.toString()
      ),
      enableCmd.output.toString()
    );
  });
  it('should disable', () => {
    const disableCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'disable.json'))
    ]);
    assert.deepStrictEqual(disableCmd.status, 0, disableCmd.output.toString());
    assert.ok(
      /to '{"enableExternalSharingModel":false}'/.test(
        disableCmd.output.toString()
      ),
      disableCmd.output.toString()
    );
  });
});
