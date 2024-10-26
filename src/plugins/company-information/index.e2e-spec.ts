import assert from 'assert';
import { CompanyInformation, Config } from './index.js';

describe(CompanyInformation.name, function () {
  let plugin: CompanyInformation;
  before(() => {
    plugin = new CompanyInformation(global.bf);
  });

  const configZAR: Config = {
    defaultCurrencyIsoCode: 'English (South Africa) - ZAR'
  };
  const configIRE: Config = {
    defaultCurrencyIsoCode: 'English (Ireland) - EUR'
  };

  it('should set the currency to "English (South Africa) - ZAR" for next steps', async () => {
    await plugin.run(configZAR);
  });
  it('should change currency to "English (Ireland) - EUR"', async () => {
    await plugin.run(configIRE);
  });
  it('should respond to no action necessary for currency change', async () => {
    const res = await plugin.run(configIRE);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
  it('should error on invalid input for invalid currency', async () => {
    let err;
    try {
      await plugin.apply({ defaultCurrencyIsoCode: 'Invalid Currency' });
    } catch (e) {
      err = e;
    }
    assert.throws(() => {
      throw err;
    }, /Invalid currency provided/);
  });
});
