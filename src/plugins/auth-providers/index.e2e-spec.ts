import assert from 'assert';
import * as child from 'child_process';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import { type Config, AuthProviders } from './index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe(AuthProviders.name, function () {
  this.timeout('10m');
  let plugin: AuthProviders;

  before(() => {
    plugin = new AuthProviders(global.browserforce);
  });

  const configWithSecretAndKey: Config = {
    TestAuthProvider: {
      consumerSecret: 'test-secret-12345',
      consumerKey: 'test-key-67890',
    },
  };

  const configWithSecretOnly: Config = {
    TestAuthProvider: {
      consumerSecret: 'updated-secret-abcde',
    },
  };

  const configWithKeyOnly: Config = {
    TestAuthProvider: {
      consumerKey: 'updated-key-fghij',
    },
  };

  const configEmpty: Config = {
    TestAuthProvider: {},
  };

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

  it('should update consumerSecret and consumerKey', async () => {
    await plugin.apply(configWithSecretAndKey);
    // Note: retrieve() returns empty config, so we can only verify apply completes without errors
  });

  it('should update consumerSecret only', async () => {
    await plugin.apply(configWithSecretOnly);
  });

  it('should update consumerKey only', async () => {
    await plugin.apply(configWithKeyOnly);
  });

  it('should handle empty config without errors', async () => {
    await plugin.apply(configEmpty);
  });

  it('should throw an error when AuthProvider does not exist', async () => {
    const configInvalid: Config = {
      NonExistentAuthProvider: {
        consumerSecret: 'test-secret',
        consumerKey: 'test-key',
      },
    };
    let err;
    try {
      await plugin.apply(configInvalid);
    } catch (e) {
      err = e;
    }
    assert.throws(() => {
      throw err;
    }, /No AuthProviders found with DeveloperNames/);
  });

  it('should remove the testing AuthProvider', async () => {
    await global.browserforce.connection.metadata.delete('AuthProvider', ['TestAuthProvider']);
  });
});
