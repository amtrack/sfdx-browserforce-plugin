import assert from 'assert';
import { type Config, LoginAccessPolicies } from './index.js';

describe(LoginAccessPolicies.name, function () {
  let plugin: LoginAccessPolicies;
  before(() => {
    plugin = new LoginAccessPolicies(global.bf);
  });

  describe('administratorsCanLogInAsAnyUser', () => {
    const configDisabled: Config = { administratorsCanLogInAsAnyUser: false };
    const configEnabled: Config = { administratorsCanLogInAsAnyUser: true };

    it('should enable', async () => {
      await plugin.run(configEnabled);
    });
    it('should be enabled', async () => {
      const res = await plugin.retrieve();
      assert.deepStrictEqual(res, configEnabled);
    });
    it('should disable', async () => {
      await plugin.apply(configDisabled);
    });
    it('should be disabled', async () => {
      const res = await plugin.retrieve();
      assert.deepStrictEqual(res, configDisabled);
    });
  });
});
