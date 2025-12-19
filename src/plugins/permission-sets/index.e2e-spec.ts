import assert from 'assert';
import * as child from 'child_process';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import { PermissionSets } from './index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe(PermissionSets.name, function () {
  this.timeout('10m');
  let plugin: PermissionSets;
  before(() => {
    plugin = new PermissionSets(global.bf);
  });

  const configurePermissionSet = [
    {
      permissionSetName: 'ServicePresenceTest',
      servicePresenceStatuses: ['TestStatus', 'TestStatus3'],
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

  it('should configure permission set presence status', async () => {
    await plugin.run(configurePermissionSet);
    const res = await plugin.retrieve(configurePermissionSet);
    assert.deepStrictEqual(res, configurePermissionSet);
  });
});
