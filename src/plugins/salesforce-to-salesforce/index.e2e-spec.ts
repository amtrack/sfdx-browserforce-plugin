import assert from 'assert';
import { SalesforceToSalesforce } from '.';

describe(SalesforceToSalesforce.name, function () {
  let plugin;
  before(() => {
    plugin = new SalesforceToSalesforce(global.bf);
  });

  const configEnabled = {
    enabled: true
  };
  const configDisabled = {
    enabled: false
  };

  it('should enable', async () => {
    await plugin.run(configEnabled);
  });
  it('should be enabled', async () => {
    const state = await plugin.retrieve();
    assert.deepStrictEqual(state, configEnabled);
  });
  it('should fail to disable', async () => {
    let err;
    try {
      await plugin.apply(configDisabled);
    } catch (e) {
      err = e;
    }
    assert.throws(() => {
      throw err;
    }, /cannot be disabled/);
  });
});
