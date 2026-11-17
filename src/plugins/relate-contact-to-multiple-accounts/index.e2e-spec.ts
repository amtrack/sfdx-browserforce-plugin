import assert from 'assert';
import { RelateContactToMultipleAccounts, relateContactToMultipleAccountsSchema } from './index.js';
import { capture } from '../../../test/capture.js';

describe(RelateContactToMultipleAccounts.name, function () {
  this.timeout('5m');
  let plugin: RelateContactToMultipleAccounts;
  before(() => {
    plugin = new RelateContactToMultipleAccounts(global.browserforce);
  });

  const configEnabled = {
    enabled: true,
  };
  const configDisabled = {
    enabled: false,
  };

  it(
    'should enable @capture',
    capture(relateContactToMultipleAccountsSchema, {
      config: { enabled: true },
      pages: {
        screenshot: {
          context: ['.bPageTitle', '.bPageBlock'],
          pills: { enabled: 'input[id$=":sharedContactsCheckBox"]' },
        },
      },
    }),
  );
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
