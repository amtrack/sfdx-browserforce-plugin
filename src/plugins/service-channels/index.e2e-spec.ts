import assert from 'assert';
import * as child from 'child_process';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import { ServiceChannels } from './index.js';
import { OmniChannelSettings } from '../omni-channel-settings/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe(ServiceChannels.name, function () {
  this.timeout('10m');
  let plugin: ServiceChannels;
  before(() => {
    plugin = new ServiceChannels(global.browserforce);
  });

  const configureServiceChannels = [
    {
      serviceChannelDeveloperName: 'CaseTest',
      capacity: {
        capacityModel: 'StatusBased',
        statusField: 'Case.Type',
        valuesForInProgress: ['Electrical', 'Mechanical'],
        checkAgentCapacityOnReopenedWorkItems: true,
        checkAgentCapacityOnReassignedWorkItems: true,
      },
    },
    {
      serviceChannelDeveloperName: 'LeadTest',
      capacity: {
        capacityModel: 'StatusBased',
        statusField: 'Lead.Industry',
        valuesForInProgress: ['Agriculture', 'Chemicals'],
        checkAgentCapacityOnReopenedWorkItems: true,
        checkAgentCapacityOnReassignedWorkItems: true,
      },
    },
  ];
  it('should disable status based capacity model', async () => {
    const omnniChannelPlugin = new OmniChannelSettings(global.browserforce);
    await omnniChannelPlugin.run({ enableStatusBasedCapacityModel: false });
  });

  it('should create service channel as a prerequisite', () => {
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

  it('should enable status based capacity model as a prerequisite', async () => {
    const omnniChannelPlugin = new OmniChannelSettings(global.browserforce);
    await omnniChannelPlugin.run({ enableStatusBasedCapacityModel: true });
  });

  it('should configure status based capacity model for service channels', async () => {
    await plugin.run(configureServiceChannels);
    const res = await plugin.retrieve(configureServiceChannels);
    assert.deepStrictEqual(res, configureServiceChannels);
  });

  it('should delete Service Channels', async () => {
    const result = await global.browserforce.connection.query(
      "SELECT Id FROM ServiceChannel WHERE DeveloperName IN ('CaseTest', 'LeadTest')",
    );
    if (result.records?.length) {
      await global.browserforce.connection.delete(
        'ServiceChannel',
        result.records.map((r) => r.Id),
      );
    }
  });
});
