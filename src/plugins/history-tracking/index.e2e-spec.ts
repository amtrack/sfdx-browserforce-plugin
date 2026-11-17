import assert from 'assert';
import * as child from 'child_process';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import { HistoryTracking, type HistoryTrackingConfig, historyTrackingSchema } from './index.js';
import { capture } from '../../../test/capture.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe(HistoryTracking.name, function () {
  let plugin: HistoryTracking;
  before(() => {
    plugin = new HistoryTracking(global.browserforce);
  });

  const enableHistoryTracking: HistoryTrackingConfig[] = [
    {
      objectApiName: 'Account',
      enableHistoryTracking: true,
      fieldHistoryTracking: [
        {
          fieldApiName: 'PersonBirthdate',
          enableHistoryTracking: true,
        },
        {
          fieldApiName: 'Test__pc',
          enableHistoryTracking: true,
        },
      ],
    },
    {
      objectApiName: 'Opportunity',
      enableHistoryTracking: true,
      fieldHistoryTracking: [
        {
          fieldApiName: 'Type',
          enableHistoryTracking: true,
        },
      ],
    },
    {
      objectApiName: 'Test__c',
      fieldHistoryTracking: [
        {
          fieldApiName: 'Owner',
          enableHistoryTracking: true,
        },
        {
          fieldApiName: 'Test__c',
          enableHistoryTracking: true,
        },
      ],
    },
  ];

  const disableHistoryTracking: HistoryTrackingConfig[] = [
    {
      objectApiName: 'Account',
      enableHistoryTracking: true,
      fieldHistoryTracking: [
        {
          fieldApiName: 'PersonBirthdate',
          enableHistoryTracking: false,
        },
        {
          fieldApiName: 'Test__pc',
          enableHistoryTracking: true,
        },
      ],
    },
    {
      objectApiName: 'Opportunity',
      enableHistoryTracking: false,
    },
    {
      objectApiName: 'Test__c',
      fieldHistoryTracking: [
        {
          fieldApiName: 'Owner',
          enableHistoryTracking: true,
        },
        {
          fieldApiName: 'Test__c',
          enableHistoryTracking: false,
        },
      ],
    },
  ];

  it('should create custom object and fields as a prerequisite', () => {
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
  it(
    'should track the history of person account fields @capture',
    capture(historyTrackingSchema, {
      config: [
        {
          objectApiName: 'Account',
          enableHistoryTracking: true,
          fieldHistoryTracking: [
            { fieldApiName: 'PersonBirthdate', enableHistoryTracking: true },
            { fieldApiName: 'Test__pc', enableHistoryTracking: true },
          ],
        },
      ],
      pages: {
        screenshot: {
          height: 1600,
          context: ['.bPageTitle'],
          pills: {
            '[0].objectApiName': '.bPageTitle h1',
            '[0].enableHistoryTracking': 'label[for="enable"]',
            '[0].fieldHistoryTracking': '#PersonBirthdate_fht',
          },
        },
      },
    }),
  );

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
  it('should remove the CustomObject and field', async () => {
    await global.browserforce.connection.metadata.delete('CustomObject', ['Test__c']);
    await global.browserforce.connection.metadata.delete('CustomField', ['Contact.Test__c']);
  });
});
