import assert from 'assert';
import { EmailDeliverability, emailDeliverabilitySchema, ACCESS_LEVEL_SELECTOR } from './index.js';
import { capture } from '../../../test/capture.js';

describe(EmailDeliverability.name, function () {
  let plugin: EmailDeliverability;
  before(() => {
    plugin = new EmailDeliverability(global.browserforce);
  });
  const configNone = {
    accessLevel: 'No access',
  } as const;
  const configAll = {
    accessLevel: 'All email',
  } as const;
  const configSystem = {
    accessLevel: 'System email only',
  } as const;
  const configInvalid = {
    accessLevel: 'Invalid',
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
  it(
    'should apply all email @capture',
    capture(emailDeliverabilitySchema, {
      config: { accessLevel: 'All email' },
      pages: {
        screenshot: {
          clip: { x: 240, y: 120, width: 1180, height: 300 },
          pills: { accessLevel: ACCESS_LEVEL_SELECTOR },
        },
      },
    }),
  );
  it('should already be have all enabled', async () => {
    const res = await plugin.retrieve();
    assert.deepStrictEqual(res, configAll);
  });
  it('should error on invalid input', async () => {
    let err;
    try {
      await plugin.apply(configInvalid as unknown as Parameters<typeof plugin.apply>[0]);
    } catch (e) {
      err = e;
    }
    assert.throws(() => {
      throw err;
    }, /Invalid email access level/);
  });
});
