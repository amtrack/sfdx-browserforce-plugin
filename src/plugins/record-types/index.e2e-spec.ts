import * as assert from 'assert';
import * as child from 'child_process';
import * as path from 'path';
import RecordTypes from '.';

describe(RecordTypes.name, function() {
  this.slow('30s');
  this.timeout('2m');
  this.slow('30s');
  this.timeout('10m');
  it('should deploy a CustomObject for testing', () => {
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
  it('should delete a record type', () => {
    const replaceCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'delete.json'))
    ]);
    assert.deepStrictEqual(replaceCmd.status, 0, replaceCmd.output.toString());
    assert(
      /changing 'deletions' to.*/.test(replaceCmd.output.toString()),
      replaceCmd.output.toString()
    );
  });
  it('should not do anything when the record type does not exist', () => {
    const replaceCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'delete.json'))
    ]);
    assert.deepStrictEqual(replaceCmd.status, 0, replaceCmd.output.toString());
    assert(
      /no action necessary/.test(replaceCmd.output.toString()),
      replaceCmd.output.toString()
    );
  });
  it('should fail deleting an active record type', () => {
    const replaceCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'delete-active.json'))
    ]);
    assert.deepStrictEqual(replaceCmd.status, 1, replaceCmd.output.toString());
    assert(
      /Cannot delete active RecordType/.test(replaceCmd.output.toString()),
      replaceCmd.output.toString()
    );
  });
  it('should delete and replace a record type', () => {
    const replaceCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'delete-and-replace.json'))
    ]);
    assert.deepStrictEqual(replaceCmd.status, 0, replaceCmd.output.toString());
    assert(
      /changing 'deletions' to.*/.test(replaceCmd.output.toString()),
      replaceCmd.output.toString()
    );
  });
});
