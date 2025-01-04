import assert from 'assert';
import * as child from 'child_process';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import { ServiceChannels } from './index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe(ServiceChannels.name, function () {
  this.timeout('10m');
  let plugin: ServiceChannels;
  before(() => {
    plugin = new ServiceChannels(global.bf);
  });

  const configureServiceChannels = [
    {
      serviceChannelDeveloperName: "CaseTest",
      capacity: {
        capacityModel: "StatusBased",
        statusField: "Case.Type",
        valuesForInProgress: ["Electrical", "Mechanical"],
        checkAgentCapacityOnReopenedWorkItems: true,
        checkAgentCapacityOnReassignedWorkItems: true
      }
    },
    {
      serviceChannelDeveloperName: "LeadTest",
      capacity: {
        capacityModel: "StatusBased",
        statusField: "Lead.Industry",
        valuesForInProgress: ["Agriculture", "Chemicals"],
        checkAgentCapacityOnReopenedWorkItems: true,
        checkAgentCapacityOnReassignedWorkItems: true
      }
    }
  ];

  it('should create service channel as a prerequisite', () => {
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

  it('should configure status based capacity model for service channels', async () => {
    await plugin.run(configureServiceChannels);
    const res = await plugin.retrieve(configureServiceChannels);
    assert.deepStrictEqual(res, configureServiceChannels);
  });
});
