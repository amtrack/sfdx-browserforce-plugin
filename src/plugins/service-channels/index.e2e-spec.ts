import assert from 'assert';
import * as child from 'child_process';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import { ServiceChannels, serviceChannelsSchema } from './index.js';
import { OmniChannelSettings } from '../omni-channel-settings/index.js';
import {
  CAPACITY_MODEL_SELECTOR,
  STATUS_FIELD_SELECTOR,
  STATUS_CHANGE_CAPACITY_SELECTOR,
  OWNER_CHANGE_CAPACITY_SELECTOR,
} from './capacity/index.js';
import { capture } from '../../../test/capture.js';

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
        capacityModel: 'StatusBased' as const,
        statusField: 'Case.Type',
        valuesForInProgress: ['Electrical', 'Mechanical'],
        checkAgentCapacityOnReopenedWorkItems: true,
        checkAgentCapacityOnReassignedWorkItems: true,
      },
    },
    {
      serviceChannelDeveloperName: 'LeadTest',
      capacity: {
        capacityModel: 'StatusBased' as const,
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
  it(
    'should count only the cases in progress against the capacity of the agents @capture',
    capture(serviceChannelsSchema, {
      config: [
        {
          serviceChannelDeveloperName: 'CaseTest',
          capacity: {
            capacityModel: 'StatusBased',
            statusField: 'Case.Status',
            valuesForInProgress: ['New', 'Working', 'Escalated'],
            checkAgentCapacityOnReopenedWorkItems: true,
            checkAgentCapacityOnReassignedWorkItems: true,
          },
        },
      ],
      pages: {
        screenshot: {
          positions: { '[0].capacity.valuesForInProgress': 'left' },
          height: 1100,
          context: ['.pbSubheader:has-text("Capacity Settings")'],
          pills: {
            '[0].capacity.capacityModel': CAPACITY_MODEL_SELECTOR,
            '[0].capacity.statusField': STATUS_FIELD_SELECTOR,
            '[0].capacity.valuesForInProgress': '#inProgressList',
            '[0].capacity.checkAgentCapacityOnReopenedWorkItems': STATUS_CHANGE_CAPACITY_SELECTOR,
            '[0].capacity.checkAgentCapacityOnReassignedWorkItems': OWNER_CHANGE_CAPACITY_SELECTOR,
          },
        },
      },
    }),
  );

  it('should configure status based capacity model for service channels', async () => {
    await plugin.run(configureServiceChannels);
    const res = await plugin.retrieve(configureServiceChannels);
    const sortValues = (channels: typeof configureServiceChannels) =>
      channels.map((channel) => ({
        ...channel,
        capacity: { ...channel.capacity, valuesForInProgress: [...channel.capacity.valuesForInProgress].sort() },
      }));
    assert.deepStrictEqual(sortValues(res as typeof configureServiceChannels), sortValues(configureServiceChannels));
  });

  it('should already be configured', async () => {
    const res = await plugin.run(configureServiceChannels);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });

  it('should move a value back out of in-progress', async () => {
    const lessInProgress = [
      {
        ...configureServiceChannels[0],
        capacity: { ...configureServiceChannels[0].capacity, valuesForInProgress: ['Mechanical'] },
      },
    ];
    await plugin.run(lessInProgress);
    const res = await plugin.retrieve(lessInProgress);
    assert.deepStrictEqual(res[0].capacity.valuesForInProgress, ['Mechanical']);
  });

  it('should switch a service channel back to the tab-based capacity model', async () => {
    const tabBased = [{ serviceChannelDeveloperName: 'CaseTest', capacity: { capacityModel: 'TabBased' as const } }];
    await plugin.run(tabBased);
    const res = await plugin.retrieve(tabBased);
    assert.deepStrictEqual(res[0].capacity, { capacityModel: 'TabBased' });
    assert.deepStrictEqual(await plugin.run(tabBased), { message: 'no action necessary' });
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
