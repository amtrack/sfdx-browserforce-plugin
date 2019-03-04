import { core } from '@salesforce/command';
import * as assert from 'assert';
import * as child from 'child_process';
import { unlink } from 'fs';
import * as path from 'path';
import { file } from 'tmp';
import { promisify } from 'util';
import CriticalUpdates from '.';
const tmpFilePromise = promisify(file);
const fsUnlinkPromise = promisify(unlink);

describe(CriticalUpdates.name, () => {
  let activatableCriticalUpdatesAvailable,
    deactivatableCriticalUpdatesAvailable = false;
  let stateFileActivation, stateFileDeactivation;
  before(async () => {
    stateFileActivation = await tmpFilePromise('state1.json');
    stateFileDeactivation = await tmpFilePromise('state2.json');
  });
  after(async () => {
    await fsUnlinkPromise(stateFileActivation);
    await fsUnlinkPromise(stateFileDeactivation);
  });
  it('should list all activatable critical updates', async function() {
    this.timeout(1000 * 90);
    this.slow(1000 * 30);
    const planActivateCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:plan',
      '-f',
      path.resolve(path.join(__dirname, 'activate-all.json')),
      '-s',
      stateFileActivation
    ]);
    assert.deepEqual(
      planActivateCmd.status,
      0,
      planActivateCmd.output.toString()
    );
    let state;
    try {
      state = await core.fs.readJson(stateFileActivation);
    } catch (err) {
      assert(false, err);
    }
    assert(state);
    assert(state.settings);
    assert(state.settings.companySettings);
    assert(state.settings.companySettings.criticalUpdates);
    if (state.settings.companySettings.criticalUpdates.length) {
      activatableCriticalUpdatesAvailable = state.settings.companySettings.criticalUpdates.some(
        item => item.active === false
      );
    }
  });
  it('should activate all available critical updates', function() {
    if (!activatableCriticalUpdatesAvailable) {
      this.skip();
    }
    this.timeout(1000 * 90);
    this.slow(1000 * 30);
    const activateCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'activate-all.json'))
    ]);
    assert.deepEqual(activateCmd.status, 0, activateCmd.output.toString());
    assert(
      /changing 'criticalUpdates' to '\[/.test(activateCmd.output.toString()),
      activateCmd.output.toString()
    );
  });
  it('should list all deactivatable critical updates', async function() {
    this.timeout(1000 * 90);
    this.slow(1000 * 30);
    const planDeactivateCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:plan',
      '-f',
      path.resolve(path.join(__dirname, 'deactivate-all.json')),
      '-s',
      '/tmp/sfdx-browserforce-plugin.state.json'
    ]);
    assert.deepEqual(
      planDeactivateCmd.status,
      0,
      planDeactivateCmd.output.toString()
    );
    let state;
    try {
      state = await core.fs.readJson(
        '/tmp/sfdx-browserforce-plugin.state.json'
      );
    } catch (err) {
      assert(false, err);
    }
    assert(state);
    assert(state.settings);
    assert(state.settings.companySettings);
    assert(state.settings.companySettings.criticalUpdates);
    if (state.settings.companySettings.criticalUpdates.length) {
      deactivatableCriticalUpdatesAvailable = state.settings.companySettings.criticalUpdates.some(
        item => item.active === true
      );
    }
  });
  it('should deactivate all deactivatable critical updates', function() {
    if (!deactivatableCriticalUpdatesAvailable) {
      this.skip();
    }
    this.timeout(1000 * 90);
    this.slow(1000 * 30);
    const deactivateCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'deactivate-all.json'))
    ]);
    assert.deepEqual(deactivateCmd.status, 0, deactivateCmd.output.toString());
    assert(
      /changing 'criticalUpdates' to '\[/.test(deactivateCmd.output.toString()),
      deactivateCmd.output.toString()
    );
  });
});
