import assert from 'assert';
import * as child from 'child_process';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import { CallSummaries, type CallSummariesConfig } from './index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe(CallSummaries.name, function () {
  this.timeout('45m');
  this.slow('1m');
  let plugin: CallSummaries;
  before(() => {
    plugin = new CallSummaries(global.browserforce);
  });

  const configEnabled: CallSummariesConfig = {
    enabled: true,
  };
  const configDisabled: CallSummariesConfig = {
    enabled: false,
  };
  it('should turn on Einstein Conversation Insights as a prerequisite', () => {
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
  it('should already be enabled', async () => {
    const res = await plugin.run(configEnabled);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
  it('should disable', async () => {
    await plugin.run(configDisabled);
  });
  it('should already be disabled', async () => {
    const res = await plugin.run(configDisabled);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
});
