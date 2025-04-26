import assert from 'assert';
import { type Config, AuthenticationConfiguration } from './index.js';

describe(AuthenticationConfiguration.name, function () {
  let plugin: AuthenticationConfiguration;

  before(() => {
    plugin = new AuthenticationConfiguration(global.bf);
  });

  describe('services configuration', () => {
    const configSingle: Config = {
      services: [
        { label: 'Login Form', enabled: true }
      ]
    };

    it('should retrieve the single enabled service', async () => {
      const res = await plugin.retrieve(configSingle);
      assert.deepStrictEqual(res, configSingle);
    });
  });
});
