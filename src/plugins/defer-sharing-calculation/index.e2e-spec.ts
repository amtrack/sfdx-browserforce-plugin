import * as assert from 'assert';
import * as child from 'child_process';
import * as path from 'path';
import DeferSharingCalculation from '.';

describe(DeferSharingCalculation.name, function() {
  this.slow('30s');
  this.timeout('2m');
  it('should assign the user defer sharing permissions', () => {
    const sourceDeployCmd = child.spawnSync('sfdx', [
      'force:source:deploy',
      '-p',
      path.join(__dirname, 'sfdx-source'),
      '--json'
    ]);
    assert.deepEqual(
      sourceDeployCmd.status,
      0,
      sourceDeployCmd.output.toString()
    );
    const stdout = JSON.parse(sourceDeployCmd.stdout.toString());
    assert(
      stdout.result &&
        stdout.result.deployedSource &&
        stdout.result.deployedSource.find(
          source => source.fullName === 'Defer_Sharing'
        ),
      sourceDeployCmd.output.toString()
    );
    const permSetAssignCmd = child.spawnSync('sfdx', [
      'force:user:permset:assign',
      '-n',
      'Defer_Sharing'
    ]);
    assert.deepEqual(
      permSetAssignCmd.status,
      0,
      permSetAssignCmd.output.toString()
    );
    assert(
      /Defer_Sharing/.test(permSetAssignCmd.output.toString()),
      permSetAssignCmd.output.toString()
    );
  });
  it('should suspend', () => {
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
  it('should already be suspendd', () => {
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
  it('should resume', () => {
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
  it('should already be resumed', () => {
    const resumeCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.join(__dirname, 'resume.json')
    ]);
    assert(
      /no action necessary/.test(resumeCmd.output.toString()) ||
        /Sharing recalculation is currently in progress, please wait until this has completed to plan/.test(
          resumeCmd.output.toString()
        ),
      resumeCmd.output.toString()
    );
  });
});
