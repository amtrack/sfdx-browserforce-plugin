import * as assert from 'assert';
import * as child from 'child_process';
import * as path from 'path';
import Picklists from '.';
import FieldDependencies from './field-dependencies';

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
  it('should add a new picklist value when it does not exist', () => {
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'new.json'))
    ]);
    assert.deepStrictEqual(cmd.status, 0, cmd.output.toString());
    assert(
      /changing 'picklistValues' to.*/.test(cmd.output.toString()),
      cmd.output.toString()
    );
  });
  it('should not do anything when picklist value already exists', () => {
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'new.json'))
    ]);
    assert.deepStrictEqual(cmd.status, 0, cmd.output.toString());
    assert(
      /no action necessary/.test(cmd.output.toString()),
      cmd.output.toString()
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
  it('should deactivate picklist value', () => {
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'deactivate.json'))
    ]);
    assert.deepStrictEqual(cmd.status, 0, cmd.output.toString());
    assert(
      /changing 'picklistValues' to.*/.test(cmd.output.toString()),
      cmd.output.toString()
    );
  });
  it('should activate picklist value', () => {
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'activate.json'))
    ]);
    assert.deepStrictEqual(cmd.status, 0, cmd.output.toString());
    assert(
      /changing 'picklistValues' to.*/.test(cmd.output.toString()),
      cmd.output.toString()
    );
  });
  it('should not do anything when the picklist values do not exist', () => {
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'activate.json'))
    ]);
    assert.deepStrictEqual(cmd.status, 0, cmd.output.toString());
    assert(
      /no action necessary/.test(cmd.output.toString()),
      cmd.output.toString()
    );
  });
  it('should replace and deactivate a picklist value', () => {
    const replaceCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'replace-and-deactivate.json'))
    ]);
    assert.deepStrictEqual(replaceCmd.status, 0, replaceCmd.output.toString());
    assert(
      /changing 'picklistValues' to.*/.test(replaceCmd.output.toString()),
      replaceCmd.output.toString()
    );
  });
});

describe(FieldDependencies.name, function() {
  this.slow('30s');
  this.timeout('10m');
  it('should not do anything when the dependency is already set', () => {
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'field-dependencies', 'set.json'))
    ]);
    assert.deepStrictEqual(cmd.status, 0, cmd.output.toString());
    assert(
      /no action necessary/.test(cmd.output.toString()),
      cmd.output.toString()
    );
  });
  it('should unset a field dependency', () => {
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'field-dependencies', 'unset.json'))
    ]);
    assert.deepStrictEqual(cmd.status, 0, cmd.output.toString());
    assert(
      /changing 'fieldDependencies' to.*/.test(cmd.output.toString()),
      cmd.output.toString()
    );
  });
  it('should not do anything when the dependency is already unset', () => {
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'field-dependencies', 'unset.json'))
    ]);
    assert.deepStrictEqual(cmd.status, 0, cmd.output.toString());
    assert(
      /no action necessary/.test(cmd.output.toString()),
      cmd.output.toString()
    );
  });
  it('should set a field dependency', () => {
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'field-dependencies', 'set.json'))
    ]);
    assert.deepStrictEqual(cmd.status, 0, cmd.output.toString());
    assert(
      /changing 'fieldDependencies' to.*/.test(cmd.output.toString()),
      cmd.output.toString()
    );
  });
  it('should change a field dependency', () => {
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'field-dependencies', 'change.json'))
    ]);
    assert.deepStrictEqual(cmd.status, 0, cmd.output.toString());
    assert(
      /changing 'fieldDependencies' to.*/.test(cmd.output.toString()),
      cmd.output.toString()
    );
  });
  it('should change back a field dependency', () => {
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'field-dependencies', 'set.json'))
    ]);
    assert.deepStrictEqual(cmd.status, 0, cmd.output.toString());
    assert(
      /changing 'fieldDependencies' to.*/.test(cmd.output.toString()),
      cmd.output.toString()
    );
  });
});
