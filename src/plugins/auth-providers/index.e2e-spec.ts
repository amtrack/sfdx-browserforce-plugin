import assert from 'assert';
import * as child from 'child_process';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import { type AuthProvidersConfig, AuthProviders, authProvidersSchema } from './index.js';
import { capture } from '../../../test/capture.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe(AuthProviders.name, function () {
  this.timeout('10m');
  let plugin: AuthProviders;

  before(() => {
    plugin = new AuthProviders(global.browserforce);
  });

  const configWithSecretOnly: AuthProvidersConfig = {
    TestAuthProvider: {
      consumerSecret: 'updated-secret-abcde',
    },
  };

  const configWithKeyOnly: AuthProvidersConfig = {
    TestAuthProvider: {
      consumerKey: 'updated-key-fghij',
    },
  };

  const configEmpty: AuthProvidersConfig = {
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

  it(
    'should update consumerSecret and consumerKey @capture',
    capture(authProvidersSchema, {
      config: { TestAuthProvider: { consumerKey: 'acme-portal-production', consumerSecret: '${PARTNER_SSO_SECRET}' } },
      pages: {
        screenshot: {
          positions: { 'TestAuthProvider.consumerKey': 'inside', 'TestAuthProvider.consumerSecret': 'inside' },
          async open(doc) {
            return doc.open(
              `/${await doc.recordId("SELECT Id FROM AuthProvider WHERE DeveloperName = 'TestAuthProvider'")}`,
            );
          },
          context: ['.bPageTitle', '.bPageBlock.brandSecondaryBrd'],
          pills: {
            'TestAuthProvider.consumerKey': 'td.labelCol:text-is("Consumer Key") + td',
            'TestAuthProvider.consumerSecret': 'td.labelCol:text-is("Consumer Secret") + td',
          },
        },
      },
    }),
  );

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
    const configInvalid: AuthProvidersConfig = {
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
