import assert from 'assert';
import { Sharing } from '.';

describe.skip(Sharing.name, function () {
  let plugin;
  before(() => {
    plugin = new Sharing(global.bf);
  });

  const configEnabled = {
    enableExternalSharingModel: true
  };
  const configDisabled = {
    enableExternalSharingModel: true
  };

  it('should enable', async () => {
    await plugin.run(configEnabled);
  });
  it('should be enabled', async () => {
    const state = await plugin.retrieve();
    assert.deepStrictEqual(state, configEnabled);
  });
  it('should disable', async () => {
    await plugin.apply(configDisabled);
  });
  it('should be disabled', async () => {
    const state = await plugin.retrieve();
    assert.deepStrictEqual(state, configDisabled);
  });
});
