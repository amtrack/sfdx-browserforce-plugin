import assert from 'assert';
import { readFileSync } from 'node:fs';
import { SalesforceCpqConfig } from './index.js';

const defaultConfig = JSON.parse(
  readFileSync(
    new URL('./default.json', import.meta.url),
    "utf8"
  )
);

const describeOrSkip = process.env['CPQ'] === 'true' ? describe : describe.skip;
describeOrSkip(SalesforceCpqConfig.name, function () {
  let plugin: SalesforceCpqConfig;
  before(() => {
    plugin = new SalesforceCpqConfig(global.bf);
  });

  const configDefault: any = defaultConfig.settings.salesforceCpqConfig;
  const configCustom = {
    documents: {
      documentFolder: 'Quotes',
      hideDocumentName: true
    },
    quote: {
      disableInitialQuoteSync: true
    }
  };

  it('should apply default config', async () => {
    await plugin.run(configDefault);
  });

  it('should already be configured', async () => {
    const res = await plugin.run(configDefault);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });

  it('should apply custom config', async () => {
    const res = await plugin.run(configCustom);
    assert.notDeepStrictEqual(res, { message: 'no action necessary' });
  });

  it('should already be configured', async () => {
    const res = await plugin.run(configCustom);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
});
