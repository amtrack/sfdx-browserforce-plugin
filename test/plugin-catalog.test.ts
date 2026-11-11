import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { z } from 'zod';
import { buildPluginCatalog, CATALOG_FORMAT_VERSION } from '../src/plugin-catalog.js';
import { ConfigParser } from '../src/config-parser.js';
import { schemas } from '../src/plugins/index.js';
import { hallOfFameUrl, listMarkdownImages, settingDocUrl } from '../src/docs.js';

describe('plugin catalog', () => {
  const catalog = buildPluginCatalog('1.2.3');

  it('describes exactly the registered plugins', () => {
    assert.deepStrictEqual(
      catalog.plugins.map((plugin) => plugin.key),
      Object.keys(schemas).toSorted(),
    );
  });

  it('carries the format and plugin versions', () => {
    assert.strictEqual(catalog.formatVersion, CATALOG_FORMAT_VERSION);
    assert.strictEqual(catalog.browserforceVersion, '1.2.3');
  });

  for (const plugin of buildPluginCatalog('0.0.0').plugins) {
    it(`${plugin.key}: has a title, fields and valid examples`, () => {
      assert.ok(plugin.title, 'title');
      assert.ok(plugin.fields.length > 0, 'fields');
      assert.ok(plugin.examples.length > 0, 'examples');
      plugin.examples.forEach((example, index) => {
        const issues = ConfigParser.validate({ settings: { [plugin.key]: example } }, { allowEnvReferences: true });
        assert.deepStrictEqual(issues, [], `example ${index}`);
      });
    });
  }

  it('flags password fields and warnings', () => {
    const authProviders = catalog.plugins.find((plugin) => plugin.key === 'authProviders');
    assert.ok(authProviders?.fields.some((field) => field.path === '*.consumerSecret' && field.isPassword));
    const customerPortal = catalog.plugins.find((plugin) => plugin.key === 'customerPortal');
    assert.strictEqual(customerPortal?.warnings.userInterface, 'classic');
    assert.deepStrictEqual(customerPortal?.warnings.irreversibleFields, ['enabled']);
    const reportsAndDashboards = catalog.plugins.find((plugin) => plugin.key === 'reportsAndDashboards');
    assert.deepStrictEqual(reportsAndDashboards?.warnings.irreversibleFields, [
      'folderSharing.enableEnhancedFolderSharing',
    ]);
    const salesforceCpqConfig = catalog.plugins.find((plugin) => plugin.key === 'salesforceCpqConfig');
    assert.ok((salesforceCpqConfig?.warnings.prerequisites.length ?? 0) > 0);
    const densitySettings = catalog.plugins.find((plugin) => plugin.key === 'densitySettings');
    assert.deepStrictEqual(densitySettings?.warnings, {
      irreversibleFields: [],
      userInterface: null,
      prerequisites: [],
    });
  });

  it('lists the removed settings with their migration instructions', () => {
    assert.ok(
      catalog.deprecatedSettings.some(
        (deprecated) =>
          deprecated.path === 'deferSharingCalculation' && deprecated.url === hallOfFameUrl('defersharingcalculation'),
      ),
    );
  });

  it('links every setting to its documentation page', () => {
    for (const plugin of catalog.plugins) {
      assert.strictEqual(plugin.docUrl, settingDocUrl(plugin.key));
    }
  });

  it('points the images of the descriptions to existing files of the repository', () => {
    const descriptions = catalog.plugins.flatMap((plugin) =>
      [plugin.description, ...plugin.fields.map((field) => field.description)].filter(
        (description): description is string => typeof description === 'string',
      ),
    );
    assert.deepStrictEqual(descriptions.flatMap(listMarkdownImages), [], 'relative image paths left');
    // the schemas themselves reference the images by their path relative to the repository root
    const images = (Object.keys(schemas) as (keyof typeof schemas)[]).flatMap((key) =>
      listMarkdownImages(JSON.stringify(z.toJSONSchema(schemas[key]))),
    );
    for (const image of images) {
      assert.ok(existsSync(new URL(`../${image}`, import.meta.url)), `missing image ${image}`);
    }
  });

  it('is serializable as JSON', () => {
    assert.deepStrictEqual(JSON.parse(JSON.stringify(catalog)), catalog);
  });
});
