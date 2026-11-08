import assert from 'node:assert';
import { BrowserforcePluginsList } from '../../../../src/commands/browserforce/plugins/list.js';
import { CATALOG_FORMAT_VERSION } from '../../../../src/plugin-catalog.js';
import { schemas } from '../../../../src/plugins/index.js';

describe(BrowserforcePluginsList.name, () => {
  it('should return the catalog of all settings without an org', async () => {
    const result = await BrowserforcePluginsList.run(['--json']);
    assert.strictEqual(result.formatVersion, CATALOG_FORMAT_VERSION);
    assert.ok(result.browserforceVersion);
    assert.strictEqual(result.plugins.length, Object.keys(schemas).length);
    assert.ok(result.deprecatedSettings.length > 0);
  }).timeout(10_000);
});
