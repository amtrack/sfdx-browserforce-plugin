import assert from 'assert';
import * as child from 'child_process';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import { DeferSharingCalculation } from './index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe(DeferSharingCalculation.name, function () {
  let plugin: DeferSharingCalculation;
  before(() => {
    plugin = new DeferSharingCalculation(global.bf);
  });
  const configSuspend = {
    suspend: true,
  };
  const configResume = {
    suspend: false,
  };
  it('should assign the user defer sharing permissions', () => {
    const sourceDeployCmd = child.spawnSync('sf', [
      'project',
      'deploy',
      'start',
      '-d',
      path.join(__dirname, 'sfdx-source'),
      '--json',
    ]);
    assert.deepStrictEqual(
      sourceDeployCmd.status,
      0,
      sourceDeployCmd.output.toString()
    );
    const permSetAssignCmd = child.spawnSync('sf', [
      'org',
      'assign',
      'permset',
      '-n',
      'Defer_Sharing',
    ]);
    assert.deepStrictEqual(
      permSetAssignCmd.status,
      0,
      permSetAssignCmd.output.toString()
    );
  });
  it('should suspend', async () => {
    await plugin.run(configSuspend);
  });
  it('should already be suspended', async () => {
    const res = await plugin.run(configSuspend);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
  it('should resume', async () => {
    await plugin.run(configResume);
  });
  it('should already be resumed', async () => {
    let err;
    let res;
    try {
      res = await plugin.run(configResume);
    } catch (e) {
      err = e;
      assert.throws(() => {
        throw err;
      }, /Sharing recalculation is currently in progress, please wait until this has completed to plan/);
    }
    if (!err) {
      assert.deepStrictEqual(res, { message: 'no action necessary' });
    }
  });
  it('should delete the PermissionSetAssignment', async () => {
    const permSetUnassignCmd = child.spawnSync('sf', [
      'data',
      'delete',
      'record',
      '-s',
      'PermissionSetAssignment',
      '-w',
      'PermissionSet.Name=Defer_Sharing',
    ]);
    assert.deepStrictEqual(
      permSetUnassignCmd.status,
      0,
      permSetUnassignCmd.output.toString()
    );
  });
});
