import assert from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BrowserforcePluginsValidate } from '../../../../src/commands/browserforce/plugins/validate.js';

describe(BrowserforcePluginsValidate.name, () => {
  let dir: string;
  before(() => {
    dir = mkdtempSync(join(tmpdir(), 'browserforce-validate-'));
  });
  after(() => {
    rmSync(dir, { recursive: true, force: true });
  });
  afterEach(() => {
    // an invalid config sets the exit code of the command, not of the test run
    process.exitCode = undefined;
  });

  it('should validate a config file and list its environment variables', async () => {
    const file = join(dir, 'valid.json');
    writeFileSync(
      file,
      JSON.stringify({
        settings: {
          authProviders: { MyProvider: { consumerSecret: '${MY_SECRET}' } },
          accountIntelligenceView: { enable: '${AIV_ENABLED}' },
        },
      }),
    );
    const result = await BrowserforcePluginsValidate.run(['-f', file, '--json']);
    assert.deepStrictEqual(result, {
      valid: true,
      settings: ['authProviders', 'accountIntelligenceView'],
      errors: [],
      environmentVariables: [
        { name: 'MY_SECRET', path: 'settings.authProviders.MyProvider.consumerSecret' },
        { name: 'AIV_ENABLED', path: 'settings.accountIntelligenceView.enable' },
      ],
    });
    assert.strictEqual(process.exitCode, undefined);
  }).timeout(10_000);

  it('should report the errors of an inline config and exit with code 1', async () => {
    const result = await BrowserforcePluginsValidate.run([
      '--config',
      JSON.stringify({ settings: { densitySettings: { density: 'Roomy' }, communities: {} } }),
      '--json',
    ]);
    assert.strictEqual(result.valid, false);
    assert.deepStrictEqual(
      result.errors.map((error) => error.path),
      ['settings.communities', 'settings.densitySettings.density'],
    );
    assert.strictEqual(process.exitCode, 1);
  }).timeout(10_000);

  it('should fail on malformed JSON', async () => {
    await assert.rejects(BrowserforcePluginsValidate.run(['--config', '{not json', '--json']), /Failed parsing config/);
  }).timeout(10_000);

  it('should require exactly one of --definitionfile and --config', async () => {
    await assert.rejects(BrowserforcePluginsValidate.run(['--json']));
    await assert.rejects(BrowserforcePluginsValidate.run(['-f', 'a.json', '--config', '{}', '--json']));
  }).timeout(10_000);
});
