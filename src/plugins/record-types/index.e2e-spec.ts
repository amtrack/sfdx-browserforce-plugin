import assert from 'assert';
import * as child from 'child_process';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import { RecordTypes } from './index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe(RecordTypes.name, function () {
  this.timeout('10m');
  let plugin: RecordTypes;
  before(() => {
    plugin = new RecordTypes(global.bf);
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
    assert.deepStrictEqual(
      sourceDeployCmd.status,
      0,
      sourceDeployCmd.output.toString()
    );
  });
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
});
