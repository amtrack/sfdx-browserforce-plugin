import assert from 'assert';
import * as child from 'child_process';
import * as path from 'path';
import { OpportunitySplits } from '.';

describe(OpportunitySplits.name, function () {
  this.slow('30s');
  this.timeout('2m');
  it('should enable Opportunity Teams as prerequisite', () => {
    const sourceDeployCmd = child.spawnSync('sfdx', [
      'force:source:deploy',
      '-p',
      path.join(__dirname, 'sfdx-source'),
      '--json'
    ]);
    assert.deepStrictEqual(
      sourceDeployCmd.status,
      0,
      sourceDeployCmd.output.toString()
    );
  });
  it('should enable', () => {
    const enableCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'enable.json'))
    ]);
    assert.deepStrictEqual(enableCmd.status, 0, enableCmd.output.toString());
    assert.ok(
      /to 'true'/.test(enableCmd.output.toString()),
      enableCmd.output.toString()
    );
  });
  it('should already be enabled', () => {
    const enableCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.join(__dirname, 'enable.json')
    ]);
    assert.deepStrictEqual(enableCmd.status, 0, enableCmd.output.toString());
    assert.ok(
      /no action necessary/.test(enableCmd.output.toString()),
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
      /to 'false'/.test(disableCmd.output.toString()),
      disableCmd.output.toString()
    );
  });
  it('should already be disabled', () => {
    const disableCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.join(__dirname, 'disable.json')
    ]);
    assert.deepStrictEqual(disableCmd.status, 0, disableCmd.output.toString());
    assert.ok(
      /no action necessary/.test(disableCmd.output.toString()),
      disableCmd.output.toString()
    );
  });
});
