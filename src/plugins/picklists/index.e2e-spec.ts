import assert from 'assert';
import * as child from 'child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import { FieldDependencies } from './field-dependencies/index.js';
import { PicklistsConfig, Picklists, picklistsSchema } from './index.js';
import { capture } from '../../../test/capture.js';

/** The list of the values on the page of a picklist field. */
const VALUES_LIST = '.bRelatedList:has(input[name="new"][onclick*="picklist_masteredit"])';

/** The lead of a use case with the Lead Source it has before the use case, created when the org does not have it. */
async function resetLead(
  lead: { FirstName: string; LastName: string; Company: string },
  leadSource: string | null,
): Promise<void> {
  const connection = global.browserforce.connection;
  const found = await connection.query(`SELECT Id FROM Lead WHERE Company = '${lead.Company}'`);
  if (found.records.length > 0) {
    await connection.sobject('Lead').update({ Id: found.records[0].Id, LeadSource: leadSource });
  } else {
    await connection.sobject('Lead').create({ ...lead, LeadSource: leadSource });
  }
}

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

  // the deployment of ContractStatus fails while the value added by the @capture step of a previous run is there
  it('should delete the contract status added by a previous run', async () => {
    await plugin.run({
      picklistValues: [
        {
          metadataType: 'StandardValueSet',
          metadataFullName: 'ContractStatus',
          value: 'Under Legal Review',
          absent: true,
        },
      ],
    });
  });
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
  it(
    'should add a contract status with its status category @capture',
    capture(picklistsSchema, {
      config: {
        picklistValues: [
          {
            metadataType: 'StandardValueSet',
            metadataFullName: 'ContractStatus',
            newValue: 'Under Legal Review',
            statusCategory: 'Draft',
          },
        ],
      },
      pages: {
        'contract-status': {
          positions: {
            'picklistValues[0].metadataFullName': 'left',
            'picklistValues[0].newValue': 'inside',
            'picklistValues[0].statusCategory': 'inside',
          },
          height: 1000,
          context: [VALUES_LIST],
          pills: {
            'picklistValues[0].metadataFullName': `${VALUES_LIST} .pbTitle h3`,
            'picklistValues[0].newValue': 'tr:has(> th:text-is("Under Legal Review")) > th',
            'picklistValues[0].statusCategory': 'tr:has(> th:text-is("Under Legal Review")) > td:nth-child(4)',
          },
        },
      },
    }),
  );
  it('should give the lead of Thandi Ndlovu the Lead Source Phone Inquiry', async () => {
    await resetLead({ FirstName: 'Thandi', LastName: 'Ndlovu', Company: 'Ndlovu Motors' }, 'Phone Inquiry');
  });
  it('should replace a value in the records', async () => {
    await plugin.run({
      picklistValues: [
        {
          metadataType: 'StandardValueSet',
          metadataFullName: 'LeadSource',
          value: 'Phone Inquiry',
          newValue: 'Other',
        },
      ],
    });
  });
  it('should replace then delete a value', async () => {
    await plugin.run({
      picklistValues: [{ metadataType: 'CustomField', metadataFullName: 'Vehicle__c.Features__c', newValue: 'CD' }],
    });
    await plugin.run({
      picklistValues: [
        {
          metadataType: 'CustomField',
          metadataFullName: 'Vehicle__c.Features__c',
          value: 'CD',
          newValue: 'Media',
          absent: true,
        },
      ],
    });
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
    await plugin.run({
      picklistValues: [
        {
          metadataType: 'CustomField',
          metadataFullName: 'Vehicle__c.Features__c',
          value: 'AUX',
          active: true,
        },
      ],
    });
    await plugin.run({
      picklistValues: [
        {
          metadataType: 'CustomField',
          metadataFullName: 'Vehicle__c.Features__c',
          value: 'AUX',
          newValue: 'Media',
        },
        {
          metadataType: 'CustomField',
          metadataFullName: 'Vehicle__c.Features__c',
          value: 'AUX',
          active: false,
        },
      ],
    });
  });
  it('should replace all blank values without an old value', async () => {
    await plugin.run(readJsonFile('./replace-all-blanks.json').settings.picklists);
  });
  it('should give the lead of Bongani Dube no Lead Source', async () => {
    await resetLead({ FirstName: 'Bongani', LastName: 'Dube', Company: 'Dube Logistics' }, null);
  });
  it('should fill the blank values of the leads', async () => {
    await plugin.run({
      picklistValues: [
        {
          metadataType: 'StandardValueSet',
          metadataFullName: 'LeadSource',
          replaceAllBlankValues: true,
          newValue: 'Purchased List',
        },
      ],
    });
  });
  it('should rename an API name', async () => {
    await plugin.run({
      picklistValues: [
        {
          metadataType: 'StandardValueSet',
          metadataFullName: 'LeadSource',
          value: 'Partner_Referral',
          newApiName: 'Partner Referral',
        },
      ],
    });
    await plugin.run({
      picklistValues: [
        {
          metadataType: 'StandardValueSet',
          metadataFullName: 'LeadSource',
          value: 'Partner Referral',
          newApiName: 'Partner_Referral',
        },
      ],
    });
  });
  it('should rename the API name and the label of a value', async () => {
    await plugin.run({
      picklistValues: [
        {
          metadataType: 'CustomField',
          metadataFullName: 'Vehicle__c.Features__c',
          value: 'Satnav',
          newApiName: 'Navigation',
          newLabel: 'Navigation System',
        },
      ],
    });
    await plugin.run({
      picklistValues: [
        {
          metadataType: 'CustomField',
          metadataFullName: 'Vehicle__c.Features__c',
          value: 'Navigation',
          newApiName: 'Satnav',
          newLabel: 'Satellite Navigation',
        },
      ],
    });
  });
  describe('rename', function () {
    const configRename = readJsonFile('./rename.json').settings.picklists;
    const configRenameBack = readJsonFile('./rename-back.json').settings.picklists;
    const features = {
      metadataType: 'CustomField' as const,
      metadataFullName: 'Vehicle__c.Features__c',
    };
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
          await plugin.run({
            picklistValues: [{ metadataType, metadataFullName, value, absent: true }],
          });
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
      await plugin.run({
        picklistValues: [{ ...configRename.picklistValues[1], newLabel: 'Satnav' }],
      });
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
        () =>
          plugin.run({
            picklistValues: [{ ...features, value: 'Navigation', newApiName: 'Media' }],
          }),
        /another value has this API name/,
      );
    });
    it('should fail when the value does not exist', async () => {
      await assert.rejects(
        () =>
          plugin.run({
            picklistValues: [{ ...features, value: 'NON_EXISTING_VALUE', newApiName: 'Other' }],
          }),
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
    it(
      'should unset a field dependency @capture',
      capture(picklistsSchema, {
        config: {
          fieldDependencies: [{ object: 'Vehicle__c', dependentField: 'Gears__c', controllingField: null }],
        },
        // the dependency before its removal
        screenshot: 'before',
        pages: {
          'field-dependencies': {
            height: 1000,
            async open(doc) {
              // the newest: the fields of a deleted Vehicle__c of a previous run keep their name
              const id = await doc.recordId(
                "SELECT Id FROM CustomField WHERE DeveloperName = 'Transmission' AND NamespacePrefix = null ORDER BY CreatedDate DESC",
                { tooling: true },
              );
              return doc.open(`/${id}`);
            },
            context: [
              '.bPageTitle',
              '.bRelatedList:has(.pbTitle h3:text-is("Field Dependencies")), .listRelatedObject:has(.pbTitle h3:text-is("Field Dependencies"))',
            ],
            pills: {
              'fieldDependencies[0].object': '.bPageTitle h1.pageType',
              'fieldDependencies[0].controllingField': '.bPageTitle h2.pageDescription',
              'fieldDependencies[0].dependentField': 'tr:has(> th:text-is("Gears"))',
            },
          },
        },
      }),
    );
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
