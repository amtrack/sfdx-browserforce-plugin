import assert from 'assert';
import { RelateContactToMultipleAccounts } from './index.js';

describe(RelateContactToMultipleAccounts.name, function () {
  let plugin: RelateContactToMultipleAccounts;
  before(() => {
    plugin = new RelateContactToMultipleAccounts(global.bf);
  });

  const configEnabled = {
    enabled: true,
  };
  const configDisabled = {
    enabled: false,
  };

  it('should enable', async () => {
    await plugin.run(configEnabled);
  });
  it('should be enabled', async () => {
    const res = await plugin.run(configEnabled);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
  it('should disable', async () => {
    await plugin.run(configDisabled);
  });
  it('should be disabled', async () => {
    const res = await plugin.run(configDisabled);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
});
