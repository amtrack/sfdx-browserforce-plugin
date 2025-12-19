import assert from 'assert';
import * as child from 'child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import { UserAccessPolicies } from './index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const readJsonFile = function (u: string) {
  return JSON.parse(readFileSync(new URL(u, import.meta.url), 'utf8'));
};

describe.skip(UserAccessPolicies.name, function () {
  this.timeout('10m');
  let plugin: UserAccessPolicies;
  before(() => {
    plugin = new UserAccessPolicies(global.bf);
  });

  const configActivate = readJsonFile('./activate.json').settings.userAccessPolicies;
  const configDeactivate = readJsonFile('./deactivate.json').settings.userAccessPolicies;
  const multiConfig = readJsonFile('./multiple-policies.json').settings.userAccessPolicies;
  const changeTriggerConfig = readJsonFile('./change-trigger-type.json').settings.userAccessPolicies;

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

  it('should activate policy', async () => {
    await plugin.run(configActivate);
  });

  it('should already be activated on default trigger type', async () => {
    const res = await plugin.run(configActivate);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });

  it('should deactivate policy', async () => {
    await plugin.run(configDeactivate);
  });

  it('should already be deactivated', async () => {
    const res = await plugin.run(configDeactivate);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });

  it('should handle multiple policies', async () => {
    await plugin.run(multiConfig);
  });

  it('should already have activated multiple policies on provided trigger types', async () => {
    const res = await plugin.run(multiConfig);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });

  it('should change trigger type of an already active policy', async () => {
    await plugin.run(changeTriggerConfig);
  });

  it('should already be activated with the new trigger type', async () => {
    const res = await plugin.run(changeTriggerConfig);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
});
