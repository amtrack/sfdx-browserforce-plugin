import assert from 'assert';
import * as child from 'child_process';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import { OpportunitySplits } from './index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe(OpportunitySplits.name, function () {
  this.timeout('15m');
  this.slow('1m');
  let plugin: OpportunitySplits;
  before(() => {
    plugin = new OpportunitySplits(global.browserforce);
  });

  const configEnabled = {
    enabled: true,
  };
  const configDisabled = {
    enabled: false,
  };
  it('should enable Opportunity Teams as prerequisite', () => {
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
  it('should enable', async () => {
    await plugin.run(configEnabled);
  });
  it('should be enabled', async () => {
    const state = await plugin.retrieve();
    assert.deepStrictEqual(state, configEnabled);
  });
  it('should disable', async () => {
    await plugin.apply(configDisabled);
  });
  it('should be disabled', async () => {
    const state = await plugin.retrieve();
    assert.deepStrictEqual(state, configDisabled);
  });
});
