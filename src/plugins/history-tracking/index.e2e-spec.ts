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

  const historyTracking = [
    {
      objectApiName: "Account",
      enableHistoryTracking: true,
      fieldHistoryTracking: [
        {
          fieldApiName: "PersonBirthdate",
          enableHistoryTracking: true
        },
        {
          fieldApiName: "Test",
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
    }
  ];

  it('should create custom field as a prerequisite', () => {
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
    await plugin.run(historyTracking);
    const res = await plugin.retrieve(historyTracking);
    assert.deepStrictEqual(res, historyTracking);
  });
});
