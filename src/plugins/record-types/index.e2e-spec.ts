import assert from 'assert';
import * as child from 'child_process';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import { RecordTypes, recordTypesSchema } from './index.js';
import { capture } from '../../../test/capture.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe(RecordTypes.name, function () {
  this.timeout('10m');
  let plugin: RecordTypes;
  before(() => {
    plugin = new RecordTypes(global.browserforce);
  });

  const configDelete = {
    deletions: [
      {
        fullName: 'Vehicle__c.SUV',
      },
    ],
  };
  const configDeleteActive = {
    deletions: [
      {
        fullName: 'Vehicle__c.CUV',
      },
    ],
  };
  const configDeleteAndReplace = {
    deletions: [
      {
        fullName: 'Vehicle__c.SportsCar',
        replacement: 'Vehicle__c.Bicycle',
      },
    ],
  };

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
  it('should create the inactive record types again', async () => {
    // deleted by a previous run
    await global.browserforce.connection.metadata.upsert('RecordType', [
      { fullName: 'Vehicle__c.SportsCar', label: 'Sports Car', active: false },
      { fullName: 'Vehicle__c.SUV', label: 'Sport Utility Vehicle', active: false },
    ]);
  });
  it(
    'should delete the retired record types @capture',
    capture(recordTypesSchema, {
      config: {
        deletions: [
          { fullName: 'Vehicle__c.SportsCar', replacement: 'Vehicle__c.Bicycle' },
          { fullName: 'Vehicle__c.SUV' },
        ],
      },
      // the record types before their deletion
      screenshot: 'before',
      pages: {
        screenshot: {
          open: (doc) => doc.open('/lightning/setup/ObjectManager/Vehicle__c/RecordTypes/view'),
          pills: {
            'deletions[0].fullName': 'tr:has(span.uiOutputText:text-is("Sports Car"))',
            'deletions[0].replacement': 'tr:has(span.uiOutputText:text-is("Bike"))',
            'deletions[1].fullName': 'tr:has(span.uiOutputText:text-is("Sport Utility Vehicle"))',
          },
        },
      },
    }),
  );
  it('should delete a record type', async () => {
    await plugin.run(configDelete);
  });
  it('should not do anything when the record type does not exist', async () => {
    const res = await plugin.run(configDelete);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
  it('should fail deleting an active record type', async () => {
    let err;
    try {
      await plugin.run(configDeleteActive);
    } catch (e) {
      err = e;
    }
    assert.throws(() => {
      throw err;
    }, /Cannot delete active RecordType/);
  });
  it('should delete and replace a record type', async () => {
    await plugin.run(configDeleteAndReplace);
  });
  it('should not need to do anything for non-existent picklists', async () => {
    const res = await plugin.run(configDeleteAndReplace);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
  it('should remove the CustomObject', async () => {
    await global.browserforce.connection.metadata.delete('CustomObject', ['Vehicle__c']);
  });
});
