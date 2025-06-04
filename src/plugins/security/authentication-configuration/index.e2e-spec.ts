import assert from 'assert';
import * as child from 'child_process';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import { type Config, AuthenticationConfiguration } from './index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));


describe(AuthenticationConfiguration.name, function () {
  let plugin: AuthenticationConfiguration;

  before(() => {
    plugin = new AuthenticationConfiguration(global.bf);
  });

  describe('authentication configuration', () => {
    const configRetrieveSingle: Config = {
      services: [
        { label: 'Login Form', enabled: true }
      ]
    };
    const configRmoveSingle: Config = {
      services: [
        { label: 'Login Form', enabled: false }
      ]
    };
    const configApplyMultiple: Config = {
      services: [
        { label: 'Login Form', enabled: false },
        { label: 'TestAuthMethod', enabled: true }
      ]
    };
    const configApplyMissing: Config = {
      services: [
        { label: 'FakeAuthMethod', enabled: true }
      ]
    };

    it('should retrieve the single enabled Login Form auth', async () => {
      const res = await plugin.retrieve(configRetrieveSingle);
      assert.deepStrictEqual(res, configRetrieveSingle);
    });

    it('should not do anything when the configuration is already set', async () => {
      const res = await plugin.run(configRetrieveSingle);
      assert.deepStrictEqual(res, { message: 'no action necessary' });
    });

    it('should throw an error when trying to remove the only enabled service', async () => {
      let err;
      try {
        await plugin.apply(configRmoveSingle);
      } catch (e) {
        err = e;
      }
      assert.throws(() => {
        throw err;
      }, /You must select at least one authentication service/);
    });

    it('should deploy an AuthProvider for testing', () => {
      const sourceDeployCmd = child.spawnSync('sf', [
        'project',
        'deploy',
        'start',
        '-d',
        path.join(__dirname, 'sfdx-source'),
        '--json'
      ]);
      assert.deepStrictEqual(sourceDeployCmd.status, 0, sourceDeployCmd.output.toString());
    });

    it('should update multiple auth services', async () => {
      await plugin.apply(configApplyMultiple);
      const res = await plugin.retrieve(configApplyMultiple);
      assert.deepStrictEqual(res, configApplyMultiple);
    });

    it('should throw an error when trying to apply a missing service', async () => {
      let err;
      try {
        await plugin.apply(configApplyMissing);
      } catch (e) {
        err = e;
      }
      assert.throws(() => {
        throw err;
      }, /not found/);
    });
  });
});
