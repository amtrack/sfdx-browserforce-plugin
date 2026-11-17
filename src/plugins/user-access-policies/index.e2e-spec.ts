import assert from 'assert';
import * as child from 'child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import { UserAccessPolicies, userAccessPoliciesSchema } from './index.js';
import { UserAccessPoliciesPage } from './page.js';
import { capture } from '../../../test/capture.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const readJsonFile = function (u: string) {
  return JSON.parse(readFileSync(new URL(u, import.meta.url), 'utf8'));
};

describe(UserAccessPolicies.name, function () {
  this.timeout('10m');
  let plugin: UserAccessPolicies;
  before(() => {
    plugin = new UserAccessPolicies(global.browserforce);
  });

  const configActivate = readJsonFile('./activate.json').settings.userAccessPolicies;
  const configDeactivate = readJsonFile('./deactivate.json').settings.userAccessPolicies;
  const multiConfig = readJsonFile('./multiple-policies.json').settings.userAccessPolicies;
  const changeTriggerConfig = readJsonFile('./change-trigger-type.json').settings.userAccessPolicies;
  const applyToAllConfig = readJsonFile('./apply-to-all.json').settings.userAccessPolicies;

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
  it(
    'should grant their permission sets to new admins @capture',
    capture(userAccessPoliciesSchema, {
      config: { accessPolicies: [{ apiName: 'Grant_Permissions', active: true, on: 'Create', applyToAll: true }] },
      pages: {
        screenshot: {
          clip: { x: 256, y: 140, width: 1184, height: 440 },
          async open(doc) {
            const id = await doc.recordId("SELECT Id FROM UserAccessPolicy WHERE DeveloperName = 'Grant_Permissions'");
            return doc.open(UserAccessPoliciesPage.getPolicyUrl(id));
          },
          pills: {
            'accessPolicies[0].apiName':
              'li.slds-page-header__detail-block:has(> p:text-is("API Name")):has-text("Grant_Permissions")',
            'accessPolicies[0].active': 'li.slds-page-header__detail-block:has(> p:text-is("Status"))',
            'accessPolicies[0].on': 'li.slds-page-header__detail-block:has(> p:text-is("Trigger Type"))',
            'accessPolicies[0].applyToAll': 'button:has-text("Apply Policy")',
          },
        },
      },
    }),
  );

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

  it('should apply the policy to all users', async () => {
    await plugin.run(applyToAllConfig);
  });

  it('should apply the policy to all users again at each run', async () => {
    // Apply To All is an action, not a state: Salesforce keeps nothing that tells it already ran
    const res = await plugin.run(applyToAllConfig);
    assert.notDeepStrictEqual(res, { message: 'no action necessary' });
  });
});
