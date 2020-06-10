import * as assert from 'assert';
import * as child from 'child_process';
import * as path from 'path';
import DeferSharingCalculation from '.';

describe(DeferSharingCalculation.name, () => {
  it('should suspend', function() {
    this.timeout(1000 * 90);
    this.slow(1000 * 30);
    const suspendCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'suspend.json'))
    ]);
    assert.deepEqual(suspendCmd.status, 0, suspendCmd.output.toString());
    assert(
      /to 'true'/.test(suspendCmd.output.toString()),
      suspendCmd.output.toString()
    );
  });
  it('should already be suspendd', function() {
    this.timeout(1000 * 90);
    this.slow(1000 * 30);
    const suspendCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.join(__dirname, 'suspend.json')
    ]);
    assert.deepEqual(suspendCmd.status, 0, suspendCmd.output.toString());
    assert(
      /no action necessary/.test(suspendCmd.output.toString()),
      suspendCmd.output.toString()
    );
  });
  it('should resume', function() {
    this.timeout(1000 * 90);
    this.slow(1000 * 30);
    const resumeCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'resume.json'))
    ]);
    assert.deepEqual(resumeCmd.status, 0, resumeCmd.output.toString());
    assert(
      /to 'false'/.test(resumeCmd.output.toString()),
      resumeCmd.output.toString()
    );
  });
  it('should already be resumed', function() {
    this.timeout(1000 * 90);
    this.slow(1000 * 30);
    const resumeCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.join(__dirname, 'resume.json')
    ]);
    assert.deepEqual(resumeCmd.status, 0, resumeCmd.output.toString());
    assert(
      /no action necessary/.test(resumeCmd.output.toString()),
      resumeCmd.output.toString()
    );
  });
});
