import assert from 'assert';
import * as child from 'child_process';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import { PermissionSets, permissionSetsSchema } from './index.js';
import { VALUES_ENABLED_SELECTOR } from './service-presence-status/index.js';
import { OmniChannelSettings } from '../omni-channel-settings/index.js';
import { capture } from '../../../test/capture.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe(PermissionSets.name, function () {
  this.timeout('10m');
  let plugin: PermissionSets;
  before(() => {
    plugin = new PermissionSets(global.browserforce);
  });

  const addConfigurePermissionSet = [
    {
      permissionSetName: 'ServicePresenceTest',
      servicePresenceStatuses: ['TestStatus', 'TestStatus3'],
    },
  ];

  const removeConfigurePermissionSet = [
    {
      permissionSetName: 'ServicePresenceTest',
      servicePresenceStatuses: [],
    },
  ];

  it('should create permission set and service presence status as a prerequisite', () => {
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
  it('should enable the status-based capacity model of Omni-Channel as a prerequisite', async () => {
    await new OmniChannelSettings(global.browserforce).run({ enableStatusBasedCapacityModel: true });
  });
  it(
    'should give the agents their presence statuses @capture',
    capture(permissionSetsSchema, {
      config: [{ permissionSetName: 'ServicePresenceTest', servicePresenceStatuses: ['TestStatus', 'TestStatus2'] }],
      pages: {
        screenshot: {
          clip: { x: 236, y: 106, width: 1184, height: 600 },
          pills: {
            '[0].permissionSetName': '.bPageTitle h2',
            '[0].servicePresenceStatuses': VALUES_ENABLED_SELECTOR,
          },
        },
      },
    }),
  );

  it('should add permission set presence status', async () => {
    await plugin.run(addConfigurePermissionSet);
    const res = await plugin.retrieve(addConfigurePermissionSet);
    assert.deepStrictEqual(res, addConfigurePermissionSet);
  });

  it('should remove permission set presence status', async () => {
    await plugin.run(removeConfigurePermissionSet);
    const res = await plugin.retrieve(removeConfigurePermissionSet);
    assert.deepStrictEqual(res, removeConfigurePermissionSet);
  });
});
