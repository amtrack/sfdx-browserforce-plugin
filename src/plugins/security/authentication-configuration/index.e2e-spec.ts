import assert from 'assert';
import * as child from 'child_process';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import { type Config, AuthenticationConfiguration } from './index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe(AuthenticationConfiguration.name, function () {
  let plugin: AuthenticationConfiguration;

  before(() => {
    plugin = new AuthenticationConfiguration(global.browserforce);
  });

  describe('authentication configuration', () => {
    const configRetrieveSingle: Config = {
      services: [{ label: 'Login Form', enabled: true }],
    };
    const configRmoveSingle: Config = {
      services: [{ label: 'Login Form', enabled: false }],
    };
    const configApplyMultiple: Config = {
      services: [
        { label: 'Login Form', enabled: false },
        { label: 'TestAuthMethod', enabled: true },
      ],
    };
    const configApplyMissing: Config = {
      services: [{ label: 'FakeAuthMethod', enabled: true }],
    };
    const resetTestState: Config = {
      services: [
        { label: 'Login Form', enabled: true },
        { label: 'TestAuthMethod', enabled: false },
      ],
    };
    const configRetrieveByApiName: Config = {
      services: [{ authProviderApiName: 'TestAuthMethod', enabled: true }],
    };
    const configApplyByApiName: Config = {
      services: [
        { label: 'Login Form', enabled: true },
        { authProviderApiName: 'TestAuthMethod', enabled: false },
      ],
    };
    const configApplyMissingApiName: Config = {
      services: [{ authProviderApiName: 'NonExistentAuthProvider', enabled: true }],
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
        '--json',
      ]);
      assert.deepStrictEqual(sourceDeployCmd.status, 0, sourceDeployCmd.output.toString());
    });

    it('should update multiple auth services', async () => {
      await plugin.apply(configApplyMultiple);
      const res = await plugin.retrieve(configApplyMultiple);
      assert.deepStrictEqual(res, configApplyMultiple);
    });

    it('should retrieve using authProviderApiName', async () => {
      const res = await plugin.retrieve(configRetrieveByApiName);
      assert.deepStrictEqual(res, configRetrieveByApiName);
    });

    it('should update auth service using authProviderApiName', async () => {
      await plugin.apply(configApplyByApiName);
      const res = await plugin.retrieve(configApplyByApiName);
      assert.deepStrictEqual(res, configApplyByApiName);
    });

    it('should not do anything when run with authProviderApiName and config already set', async () => {
      const res = await plugin.run(configApplyByApiName);
      assert.deepStrictEqual(res, { message: 'no action necessary' });
    });

    it('should throw an error when authProviderApiName does not exist', async () => {
      let err;
      try {
        await plugin.apply(configApplyMissingApiName);
      } catch (e) {
        err = e;
      }
      assert.throws(() => {
        throw err;
      }, /not found/);
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

    it('should reset auth services back to default', async () => {
      await plugin.apply(resetTestState);
      const res = await plugin.retrieve(resetTestState);
      assert.deepStrictEqual(res, resetTestState);
    });

    it('should remove the testing AuthProvider', async () => {
      await global.browserforce.connection.metadata.delete('AuthProvider', ['TestAuthMethod']);
    });
  });
});
