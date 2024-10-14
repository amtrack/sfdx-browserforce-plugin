import assert from 'assert';
import { type Config, SalesforceCpqConfig } from '.';
import defaultConfig from './default.json';

describe(SalesforceCpqConfig.name, function () {
  let plugin: SalesforceCpqConfig;
  before(() => {
    plugin = new SalesforceCpqConfig(global.bf);
  });

  const configDefault: Config = defaultConfig;
  it('should enable', async () => {
    await plugin.run(configDefault);
  });
  it('should already be enabled', async () => {
    const res = await plugin.run(configDefault);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
});
