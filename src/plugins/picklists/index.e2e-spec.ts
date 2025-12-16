import assert from 'assert';
import * as child from 'child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import { Picklists } from './index.js';
import { FieldDependencies } from './field-dependencies/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const readJsonFile = function (u: string) {
  return JSON.parse(readFileSync(new URL(u, import.meta.url), 'utf8'));
};

describe(Picklists.name, function () {
  this.timeout('15m');
  let plugin: Picklists;
  before(() => {
    plugin = new Picklists(global.bf);
  });
  after(() => {
    it('should remove the CustomObject', async () => {
      const conn = global.bf.org.getConnection();
      await conn.metadata.delete('CustomObject', ['Vehicle__c']);
    });
  });

  const configNew = readJsonFile('./new.json').settings.picklists;
  const configReplace = readJsonFile('./replace.json').settings.picklists;
  const configReplaceAndDelete = readJsonFile('./replace-and-delete.json').settings.picklists;
  const configDeactivate = readJsonFile('./deactivate.json').settings.picklists;
  const configActivate = readJsonFile('./activate.json').settings.picklists;
  const configReplaceAndDeactivate = readJsonFile('./replace-and-deactivate.json').settings.picklists;

  it('should deploy a CustomObject for testing', () => {
    const sourceDeployCmd = child.spawnSync('sf', [
      'project',
      'deploy',
      'start',
      '-d',
      path.join(__dirname, 'sfdx-source'),
      '--json',
    ]);
    assert.deepStrictEqual(sourceDeployCmd.status, 0, sourceDeployCmd.output.toString());
  });
  it('should add a new picklist value when it does not exist', async () => {
    await plugin.run(configNew);
  });
  it('should not do anything when picklist value already exists', async () => {
    const res = await plugin.run(configNew);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
  it('should replace picklist values', async () => {
    await plugin.run(configReplace);
  });
  it('should replace and delete picklist values', async () => {
    await plugin.run(configReplaceAndDelete);
  });
  it('should not do anything when the picklist values do not exist', async () => {
    const res = await plugin.run(configReplaceAndDelete);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
  it('should deactivate picklist value', async () => {
    await plugin.run(configDeactivate);
  });
  it('should activate picklist value', async () => {
    await plugin.run(configActivate);
  });
  it('should not do anything when the picklist values already exist', async () => {
    const res = await plugin.run(configActivate);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
  it('should replace and deactivate a picklist value', async () => {
    await plugin.run(configReplaceAndDeactivate);
  });
  describe(FieldDependencies.name, function () {
    this.timeout('10m');
    let plugin: FieldDependencies;
    before(() => {
      plugin = new FieldDependencies(global.bf);
    });

    const configSet = readJsonFile('./field-dependencies/set.json').settings.picklists.fieldDependencies;
    const configUnset = readJsonFile('./field-dependencies/unset.json').settings.picklists.fieldDependencies;
    const configChange = readJsonFile('./field-dependencies/change.json').settings.picklists.fieldDependencies;

    it('should not do anything when the dependency is already set', async () => {
      const res = await plugin.run(configSet);
      assert.deepStrictEqual(res, { message: 'no action necessary' });
    });
    it('should unset a field dependency', async () => {
      await plugin.run(configUnset);
    });
    it('should not do anything when the dependency is already unset', async () => {
      const res = await plugin.run(configUnset);
      assert.deepStrictEqual(res, { message: 'no action necessary' });
    });
    it('should set a field dependency', async () => {
      await plugin.run(configSet);
    });
    it('should change a field dependency', async () => {
      await plugin.run(configChange);
    });
    it('should change back a field dependency', async () => {
      await plugin.run(configSet);
    });
  });
});
