import assert from 'assert';
import * as child from 'child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import { FieldDependencies } from './field-dependencies/index.js';
import { PicklistsConfig, Picklists } from './index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const readJsonFile = function (u: string) {
  return JSON.parse(readFileSync(new URL(u, import.meta.url), 'utf8'));
};

describe(Picklists.name, function () {
  this.timeout('10m');
  let plugin: Picklists;
  before(() => {
    plugin = new Picklists(global.browserforce);
  });
  after(() => {
    it('should remove the CustomObject', async () => {
      await global.browserforce.connection.metadata.delete('CustomObject', ['Vehicle__c']);
      await global.browserforce.connection.metadata.delete('GlobalValueSet', ['VehicleGears', 'VehicleTransmission']);
    });
  });

  const configNew = readJsonFile('./new.json').settings.picklists;
  const configReplace = readJsonFile('./replace.json').settings.picklists;
  const configReplaceAndDelete = readJsonFile('./replace-and-delete.json').settings.picklists;
  const configDeactivate = readJsonFile('./deactivate.json').settings.picklists;
  const configActivate = readJsonFile('./activate.json').settings.picklists;
  const configDeactivateWithDep: PicklistsConfig = {
    picklistValues: [
      {
        metadataType: 'CustomField',
        metadataFullName: 'Vehicle__c.Type__c',
        value: 'A',
        active: false,
      },
    ],
  };
  const configActivateWithDep: PicklistsConfig = {
    picklistValues: [
      {
        metadataType: 'CustomField',
        metadataFullName: 'Vehicle__c.Type__c',
        value: 'A',
        active: true,
      },
    ],
  };
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
  it('should deactivate picklist value having a dependency', async () => {
    await plugin.run(configDeactivateWithDep);
  });
  it('should activate picklist value having a dependency', async () => {
    await plugin.run(configActivateWithDep);
  });
  it('should not do anything when the picklist values already exist', async () => {
    const res = await plugin.run(configActivate);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
  it('should replace and deactivate a picklist value', async () => {
    await plugin.run(configReplaceAndDeactivate);
  });
  describe('rename', function () {
    const configRename = readJsonFile('./rename.json').settings.picklists;
    const configRenameBack = readJsonFile('./rename-back.json').settings.picklists;
    const features = { metadataType: 'CustomField' as const, metadataFullName: 'Vehicle__c.Features__c' };
    let leadId: string;
    const leadSource = async () =>
      (await global.browserforce.connection.sobject('Lead').retrieve(leadId)).LeadSource as string;
    const isActive = async (value: string) =>
      (await plugin.retrieve({ picklistValues: [{ ...features, value, active: true }] })).picklistValues[0].active;

    before(async () => {
      // a failed run may have left the values renamed: rename them back, or delete the renamed value when deploying
      // the fixtures created the old one again
      for (const action of configRenameBack.picklistValues) {
        await plugin.run({ picklistValues: [action] }).catch(async (error: Error) => {
          if (!/another value has this API name/.test(error.message)) {
            throw error;
          }
          const { metadataType, metadataFullName, value } = action;
          await plugin.run({ picklistValues: [{ metadataType, metadataFullName, value, absent: true }] });
        });
      }
      const lead = await global.browserforce.connection
        .sobject('Lead')
        .create({ LastName: 'Browserforce', Company: 'Rename', LeadSource: 'Partner Referral' });
      leadId = lead.id!;
    });
    after(async () => {
      if (leadId) {
        await global.browserforce.connection.sobject('Lead').destroy(leadId);
      }
    });

    it('should deactivate the value to rename', async () => {
      await plugin.run({ picklistValues: [{ ...features, value: 'Navigation', active: false }] });
    });
    it('should rename an active and an inactive picklist value', async () => {
      await plugin.run(configRename);
      assert.deepStrictEqual(await leadSource(), 'Partner_Referral');
      assert.deepStrictEqual(await isActive('Satnav'), false);
    });
    it('should not do anything when the picklist values are already renamed', async () => {
      const res = await plugin.run(configRename);
      assert.deepStrictEqual(res, { message: 'no action necessary' });
    });
    it('should only change the label of a renamed value', async () => {
      await plugin.run({ picklistValues: [{ ...configRename.picklistValues[1], newLabel: 'Satnav' }] });
      const state = await plugin.retrieve(configRename);
      assert.deepStrictEqual(state.picklistValues[1].newLabel, 'Satnav');
    });
    it('should rename the picklist values back', async () => {
      await plugin.run(configRenameBack);
      assert.deepStrictEqual(await leadSource(), 'Partner Referral');
      assert.deepStrictEqual(await isActive('Navigation'), false);
      const res = await plugin.run(configRenameBack);
      assert.deepStrictEqual(res, { message: 'no action necessary' });
    });
    it('should fail when the new API name is used by another value', async () => {
      await assert.rejects(
        () => plugin.run({ picklistValues: [{ ...features, value: 'Navigation', newApiName: 'Media' }] }),
        /another value has this API name/,
      );
    });
    it('should fail when the value does not exist', async () => {
      await assert.rejects(
        () => plugin.run({ picklistValues: [{ ...features, value: 'NON_EXISTING_VALUE', newApiName: 'Other' }] }),
        /no value has this API name/,
      );
    });
    it('should activate the renamed value again', async () => {
      await plugin.run({ picklistValues: [{ ...features, value: 'Navigation', active: true }] });
    });
  });
  describe(FieldDependencies.name, function () {
    this.timeout('10m');
    let plugin: FieldDependencies;
    before(() => {
      plugin = new FieldDependencies(global.browserforce);
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
