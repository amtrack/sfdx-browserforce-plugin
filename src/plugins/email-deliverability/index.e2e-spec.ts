import assert from 'assert';
import { EmailDeliverability } from '.';

describe(EmailDeliverability.name, function () {
  let plugin: EmailDeliverability;
  before(() => {
    plugin = new EmailDeliverability(global.bf);
  });
  const configNone = {
    accessLevel: 'No access'
  };
  const configAll = {
    accessLevel: 'All email'
  };
  const configSystem = {
    accessLevel: 'System email only'
  };
  const configInvalid = {
    accessLevel: 'Invalid'
  };

  // Note order is important here, the scratch org will be created with all access set, I have placed last so if a scratch is reused at least it is in the same state
  it('should set "no access"', async () => {
    await plugin.run(configNone);
  });
  it('should already be set to "no access"', async () => {
    const res = await plugin.retrieve();
    assert.deepStrictEqual(res, configNone);
  });
  it('should set "system only"', async () => {
    await plugin.apply(configSystem);
  });
  it('should be set to "system only"', async () => {
    const res = await plugin.retrieve();
    assert.deepStrictEqual(res, configSystem);
  });
  it('should apply all email', async () => {
    await plugin.apply(configAll);
  });
  it('should already be have all enabled', async () => {
    const res = await plugin.retrieve();
    assert.deepStrictEqual(res, configAll);
  });
  it('should error on invalid input', async () => {
    let err;
    try {
      await plugin.apply(configInvalid);
    } catch (e) {
      err = e;
    }
    assert.throws(() => {
      throw err;
    }, /Invalid email access level/);
  });
});
