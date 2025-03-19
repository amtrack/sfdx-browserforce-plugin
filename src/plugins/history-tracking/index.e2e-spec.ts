import assert from 'assert';
import * as child from 'child_process';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import { HistoryTracking } from './index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe(HistoryTracking.name, function () {
  let plugin: HistoryTracking;
  before(() => {
    plugin = new HistoryTracking(global.bf);
  });

  const enableHistoryTracking = [
    {
      objectApiName: "Account",
      enableHistoryTracking: true,
      fieldHistoryTracking: [
        {
          fieldApiName: "PersonBirthdate",
          enableHistoryTracking: true
        },
        {
          fieldApiName: "Test__pc",
          enableHistoryTracking: true
        }
      ]
    },
    {
      objectApiName: "Opportunity",
      enableHistoryTracking: true,
      fieldHistoryTracking: [
        {
          fieldApiName: "Type",
          enableHistoryTracking: true
        }
      ]
    },
    {
      objectApiName: "Test__c",
      fieldHistoryTracking: [
        {
          fieldApiName: "Owner",
          enableHistoryTracking: true
        },
        {
          fieldApiName: "Test__c",
          enableHistoryTracking: true
        }
      ]
    }
  ];

  const disableHistoryTracking = [
    {
      objectApiName: "Account",
      enableHistoryTracking: true,
      fieldHistoryTracking: [
        {
          fieldApiName: "PersonBirthdate",
          enableHistoryTracking: false
        },
        {
          fieldApiName: "Test__pc",
          enableHistoryTracking: true
        }
      ]
    },
    {
      objectApiName: "Opportunity",
      enableHistoryTracking: false
    },
    {
      objectApiName: "Test__c",
      fieldHistoryTracking: [
        {
          fieldApiName: "Owner",
          enableHistoryTracking: true
        },
        {
          fieldApiName: "Test__c",
          enableHistoryTracking: false
        }
      ]
    }
  ];

  it('should create custom object and fields as a prerequisite', () => {
    const sourceDeployCmd = child.spawnSync('sf', [
      'project',
      'deploy',
      'start',
      '-d',
      path.join(__dirname, 'sfdx-source'),
      '--json'
    ]);
    assert.deepStrictEqual(sourceDeployCmd.status, 0, sourceDeployCmd.output.toString());
  });

  it('should enable history tracking for objects and fields', async () => {
    await plugin.run(enableHistoryTracking);
    const res = await plugin.retrieve(enableHistoryTracking);
    assert.deepStrictEqual(res, enableHistoryTracking);
  });

  it('should disable history tracking for objects and fields', async () => {
    await plugin.run(disableHistoryTracking);
    const res = await plugin.retrieve(disableHistoryTracking);
    assert.deepStrictEqual(res, disableHistoryTracking);
  });
});
