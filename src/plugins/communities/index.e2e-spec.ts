import assert from 'assert';
import { Communities } from './index.js';

describe.skip(Communities.name, function () {
  let plugin: Communities;
  before(() => {
    plugin = new Communities(global.bf);
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
    const res = await plugin.run(configEnabled);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
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
