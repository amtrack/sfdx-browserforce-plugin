import assert from 'assert';
import * as child from 'child_process';
import * as path from 'path';
import { DeferSharingCalculation } from '.';

describe(DeferSharingCalculation.name, function () {
  let plugin;
  before(() => {
    plugin = new DeferSharingCalculation(global.bf);
  });
  const configSuspend = {
    suspend: true
  };
  const configResume = {
    suspend: false
  };
  it('should assign the user defer sharing permissions', () => {
    const sourceDeployCmd = child.spawnSync('sfdx', [
      'force:source:deploy',
      '-p',
      path.join(__dirname, 'sfdx-source'),
      '--json'
    ]);
    assert.deepStrictEqual(
      sourceDeployCmd.status,
      0,
      sourceDeployCmd.output.toString()
    );
    const stdout = JSON.parse(sourceDeployCmd.stdout.toString());
    assert.ok(
      stdout.result &&
        stdout.result.deployedSource &&
        stdout.result.deployedSource.find(
          source => source.fullName === 'Defer_Sharing'
        ),
      sourceDeployCmd.output.toString()
    );
    const permSetAssignCmd = child.spawnSync('sfdx', [
      'force:user:permset:assign',
      '-n',
      'Defer_Sharing'
    ]);
    assert.deepStrictEqual(
      permSetAssignCmd.status,
      0,
      permSetAssignCmd.output.toString()
    );
    assert.ok(
      /Defer_Sharing/.test(permSetAssignCmd.output.toString()),
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
    const permSetUnassignCmd = child.spawnSync('sfdx', [
      'force:data:record:delete',
      '-s',
      'PermissionSetAssignment',
      '-w',
      'PermissionSet.Name=Defer_Sharing'
    ]);
    assert.deepStrictEqual(
      permSetUnassignCmd.status,
      0,
      permSetUnassignCmd.output.toString()
    );
    assert.ok(
      /Successfully deleted record/.test(permSetUnassignCmd.output.toString()),
      permSetUnassignCmd.output.toString()
    );
  });
});
