import assert from 'node:assert';
import { rawFileUrl, rewriteMarkdownImages } from '../src/docs.js';
import { flattenFields, inlineRefs, type JsonSchema, schemaAtPath, schemaType } from '../src/json-schema-utils.js';
import { getPluginJsonSchema } from '../src/plugin-catalog.js';
import { authProvidersSchema } from '../src/plugins/auth-providers/index.js';

const pluginSchema = (key: string): JsonSchema => getPluginJsonSchema(key) as JsonSchema;

describe('inlineRefs', () => {
  it('replaces $ref by the definition, merges single allOf and drops definitions', () => {
    const schema = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      $ref: '#/definitions/root',
      definitions: {
        root: { type: 'object', properties: { item: { allOf: [{ $ref: '#/definitions/item' }], title: 'Item' } } },
        item: { type: 'string' },
      },
    };
    assert.deepStrictEqual(inlineRefs(schema), {
      type: 'object',
      properties: { item: { type: 'string', title: 'Item' } },
    });
  });

  it('keeps a property named like a JSON Schema keyword', () => {
    const schema = { type: 'object', properties: { definitions: { type: 'string' } } };
    assert.deepStrictEqual(inlineRefs(schema), schema);
  });

  it('fails on a recursive reference', () => {
    const schema = {
      $ref: '#/definitions/node',
      definitions: { node: { type: 'object', properties: { child: { $ref: '#/definitions/node' } } } },
    };
    assert.throws(() => inlineRefs(schema), /Recursive JSON Schema reference/);
  });

  it('leaves no $ref in any plugin schema', () => {
    for (const key of ['authProviders', 'customerPortal', 'historyTracking', 'security', 'serviceChannels']) {
      assert.ok(!JSON.stringify(pluginSchema(key)).includes('$ref'), key);
    }
  });
});

describe('schemaAtPath / schemaType', () => {
  it('follows properties, array items and record entries', () => {
    assert.strictEqual(schemaType(schemaAtPath(pluginSchema('accountIntelligenceView'), ['enable'])), 'boolean');
    assert.strictEqual(
      schemaType(
        schemaAtPath(pluginSchema('historyTracking'), [0, 'fieldHistoryTracking', 1, 'enableHistoryTracking']),
      ),
      'boolean',
    );
    assert.strictEqual(
      schemaType(schemaAtPath(pluginSchema('authProviders'), ['AnyName', 'consumerSecret'])),
      'string',
    );
    assert.strictEqual(schemaType(schemaAtPath(pluginSchema('densitySettings'), ['density'])), 'string');
    assert.strictEqual(schemaType(schemaAtPath(pluginSchema('historyTracking'), [])), 'array');
    assert.strictEqual(schemaAtPath(pluginSchema('densitySettings'), ['unknown']), undefined);
  });
});

describe('flattenFields', () => {
  it('lists the fields of a plain object with their enum', () => {
    const { groups, fields } = flattenFields(pluginSchema('densitySettings'));
    assert.deepStrictEqual(groups, []);
    assert.deepStrictEqual(fields, [
      {
        path: 'density',
        type: 'string',
        title: 'Density',
        description: 'Choose the default display setting for your org',
        required: false,
        enum: ['Comfy', 'Compact'],
        isPassword: false,
        isIrreversible: false,
      },
    ]);
  });

  it('describes entries keyed by name as a record group, with password fields', () => {
    const { groups, fields } = flattenFields(pluginSchema('authProviders'));
    assert.deepStrictEqual(groups, [
      {
        path: '*',
        kind: 'record',
        title: 'Auth Providers',
        // the catalog shows the images of the descriptions from GitHub
        description: rewriteMarkdownImages(authProvidersSchema.meta()?.description ?? '', rawFileUrl),
        keyPattern: '^[a-zA-Z0-9_]+$',
      },
    ]);
    assert.deepStrictEqual(
      fields.map((field) => [field.path, field.group, field.type, field.isPassword]),
      [
        ['*.consumerSecret', '*', 'string', true],
        ['*.consumerKey', '*', 'string', false],
      ],
    );
  });

  it('describes a setting that is an array as a group, and nested arrays as json', () => {
    const { groups, fields } = flattenFields(pluginSchema('historyTracking'));
    assert.deepStrictEqual(
      groups.map((group) => [group.path, group.kind]),
      [['[]', 'array']],
    );
    assert.deepStrictEqual(
      fields.map((field) => [field.path, field.type, field.required]),
      [
        ['[].objectApiName', 'string', true],
        ['[].enableHistoryTracking', 'boolean', false],
        ['[].fieldHistoryTracking', 'json', false],
      ],
    );
  });

  it('types an array of strings as string[]', () => {
    const { fields } = flattenFields(pluginSchema('listViewCustomButtons'));
    assert.deepStrictEqual(fields.find((field) => field.path === '[].buttons')?.type, 'string[]');
  });

  it('flattens nested objects with dot paths', () => {
    const { groups, fields } = flattenFields(pluginSchema('salesforceCpqConfig'));
    assert.deepStrictEqual(groups, []);
    assert.ok(fields.some((field) => field.path === 'documents.documentFolder' && field.type === 'string'));
  });

  it('describes an array field of an object as a group', () => {
    const { groups, fields } = flattenFields(pluginSchema('customerPortal'));
    assert.deepStrictEqual(
      groups.map((group) => group.path),
      ['portals[]', 'availableCustomObjects[]'],
    );
    assert.ok(fields.some((field) => field.path === 'portals[].name' && field.group === 'portals[]' && field.required));
    assert.ok(fields.some((field) => field.path === 'portals[].portalProfileMemberships' && field.type === 'json'));
  });
});
