import * as assert from 'assert';
import * as child from 'child_process';
import * as path from 'path';
import Picklists from '.';

describe(Picklists.name, function() {
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
  it('should replace picklist values', () => {
    const replaceCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'replace.json'))
    ]);
    assert.deepStrictEqual(replaceCmd.status, 0, replaceCmd.output.toString());
    assert(
      /changing 'picklistValues' to.*/.test(replaceCmd.output.toString()),
      replaceCmd.output.toString()
    );
  });
  it('should replace and delete picklist values', () => {
    const replaceCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'replace-and-delete.json'))
    ]);
    assert.deepStrictEqual(replaceCmd.status, 0, replaceCmd.output.toString());
    assert(
      /changing 'picklistValues' to.*/.test(replaceCmd.output.toString()),
      replaceCmd.output.toString()
    );
  });
  it('should not do anything when the picklist values do not exist', () => {
    const replaceCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'replace-and-delete.json'))
    ]);
    assert.deepStrictEqual(replaceCmd.status, 0, replaceCmd.output.toString());
    assert(
      /no action necessary/.test(replaceCmd.output.toString()),
      replaceCmd.output.toString()
    );
  });
});