import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { describe, it } from 'mocha';
import { z } from 'zod';

// Converts a plugin schema to the JSON Schema shape produced for its `definitions.<id>` entry,
// i.e. with the `.meta` id-hoisting undone, so it can be compared against the source schema.json.
function toDefinitionJsonSchema(schema: z.ZodType): unknown {
  const wrapper = z.toJSONSchema(z.object({ x: schema }), { target: 'draft-7', io: 'input' });
  const id = (schema.meta() as { id?: string } | undefined)?.id;
  const definition = (wrapper.definitions as Record<string, unknown>)[id!];
  return definition;
}

function readExpectedSchema(dir: string): Record<string, unknown> {
  const json = JSON.parse(readFileSync(new URL(`./${dir}/schema.json`, import.meta.url), 'utf8')) as Record<
    string,
    unknown
  >;
  delete json.$schema;
  delete json.$id;
  return json;
}

// Converts a root-rooted (array or object) plugin schema directly to JSON Schema, i.e. without
// wrapping it in a synthetic parent object, so it can be compared against a root-shaped schema.json.
function toRootJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const doc = z.toJSONSchema(schema, { target: 'draft-7', io: 'input' }) as Record<string, unknown>;
  delete doc.$schema;
  return doc;
}

// Renames a `definitions.<oldName>` entry (and every `#/definitions/<oldName>` $ref pointing at it)
// to `<newName>`, to normalise the known `action` -> `picklistAction`/`recordTypeAction` rename delta.
function renameDefinition(json: Record<string, unknown>, oldName: string, newName: string): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(json));
  const definitions = clone.definitions as Record<string, unknown>;
  definitions[newName] = definitions[oldName];
  delete definitions[oldName];
  const oldRef = `#/definitions/${oldName}`;
  const newRef = `#/definitions/${newName}`;
  const rewriteRefs = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) {
        rewriteRefs(item);
      }
    } else if (node && typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      if (obj.$ref === oldRef) {
        obj.$ref = newRef;
      }
      for (const value of Object.values(obj)) {
        rewriteRefs(value);
      }
    }
  };
  rewriteRefs(clone);
  return clone;
}

// Normalises draft-7's `"type": ["string", "null"]` nullable idiom to the `anyOf` shape zod emits
// for `z.string().nullable()`, to match the pinned zod behaviour for nullable fields.
function nullableTypeToAnyOf(json: Record<string, unknown>): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(json));
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) {
        walk(item);
      }
    } else if (node && typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      if (Array.isArray(obj.type) && obj.type.length === 2 && obj.type.includes('null')) {
        const otherType = obj.type.find((t) => t !== 'null');
        delete obj.type;
        obj.anyOf = [{ type: otherType }, { type: 'null' }];
      }
      for (const value of Object.values(obj)) {
        walk(value);
      }
    }
  };
  walk(clone);
  return clone;
}

// Normalises a `patternProperties` root (the shape `z.record` with a regex key produces as
// `propertyNames` + `additionalProperties`) into that emitted shape, to match auth-providers.
function patternPropertiesToRecord(json: Record<string, unknown>): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(json)) as Record<string, unknown>;
  const patternProperties = clone.patternProperties as Record<string, unknown>;
  const pattern = Object.keys(patternProperties)[0];
  delete clone.patternProperties;
  clone.propertyNames = { type: 'string', pattern };
  clone.additionalProperties = patternProperties[pattern];
  return clone;
}

// Adds the `minimum`/`maximum` bounds zod's `z.number().int()` emits alongside `type: 'integer'`,
// at the given dotted path under `definitions`, to match the source's bare `type: 'integer'`.
function addIntegerBounds(
  json: Record<string, unknown>,
  definitionName: string,
  propertyName: string,
): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(json)) as Record<string, unknown>;
  const definitions = clone.definitions as Record<string, unknown>;
  const definition = definitions[definitionName] as { properties: Record<string, Record<string, unknown>> };
  const property = definition.properties[propertyName];
  property.minimum = -9007199254740991;
  property.maximum = 9007199254740991;
  return clone;
}

// Adds a bare `items: {}` where the source array has no `items` keyword, to match the `items`
// zod always emits for `z.array(...)`.
function addMissingItems(
  json: Record<string, unknown>,
  propertyName: string,
  items: Record<string, unknown> = {},
): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(json)) as Record<string, unknown>;
  const properties = clone.properties as Record<string, Record<string, unknown>>;
  properties[propertyName].items = items;
  return clone;
}

// Merges an externally-`$ref`-ed sub-schema (as read from its own schema.json) into `definitions`
// under `defId`, and rewrites every matching `$ref` to the `allOf`-wrapped internal reference that
// zod produces for an optional cross-file schema reference.
function mergeExternalRef(
  json: Record<string, unknown>,
  refPath: string,
  defId: string,
  subSchema: Record<string, unknown>,
): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(json)) as Record<string, unknown>;
  const { definitions: subDefinitions, ...subRoot } = subSchema;
  const definitions = (clone.definitions ??= {}) as Record<string, unknown>;
  if (subDefinitions) {
    Object.assign(definitions, subDefinitions as Record<string, unknown>);
  }
  definitions[defId] = subRoot;
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) {
        walk(item);
      }
    } else if (node && typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      for (const [key, value] of Object.entries(obj)) {
        if (value && typeof value === 'object' && (value as Record<string, unknown>).$ref === refPath) {
          obj[key] = { allOf: [{ $ref: `#/definitions/${defId}` }] };
        } else {
          walk(value);
        }
      }
    }
  };
  walk(clone);
  return clone;
}

describe('plugin schemas', () => {
  const flatPlugins = [
    'activity-settings',
    'company-information',
    'density-settings',
    'email-deliverability',
    'high-velocity-sales-settings',
    'lightning-experience-settings',
    'linkedin-sales-navigator-settings',
    'omni-channel-settings',
    'opportunity-splits',
    'relate-contact-to-multiple-accounts',
    'salesforce-to-salesforce',
    'slack',
  ];

  for (const dir of flatPlugins) {
    it(`converts ${dir}/schema.ts to the same JSON Schema as ${dir}/schema.json`, async () => {
      const { schema } = await import(`./${dir}/schema.js`);
      const result = toDefinitionJsonSchema(schema);
      const expected = readExpectedSchema(dir);
      assert.deepStrictEqual(result, expected);
    });
  }

  // Array-rooted and inline-definition plugins: converted directly (not wrapped) and compared against
  // schema.json modulo the enumerated deltas.
  const rootPlugins = [
    'history-tracking',
    'list-view-custom-buttons',
    'home-page-layouts',
    'user-access-policies',
    'customer-portal',
  ];

  for (const dir of rootPlugins) {
    it(`converts ${dir}/schema.ts to the same JSON Schema as ${dir}/schema.json`, async () => {
      const { schema } = await import(`./${dir}/schema.js`);
      const result = toRootJsonSchema(schema);
      const expected = readExpectedSchema(dir);
      assert.deepStrictEqual(result, expected);
    });
  }

  it('converts record-types/schema.ts to the same JSON Schema as record-types/schema.json, modulo the action -> recordTypeAction rename', async () => {
    const { schema } = await import('./record-types/schema.js');
    const result = toRootJsonSchema(schema);
    const expected = renameDefinition(readExpectedSchema('record-types'), 'action', 'recordTypeAction');
    assert.deepStrictEqual(result, expected);
  });

  it('converts picklists/field-dependencies/schema.ts to the same JSON Schema as picklists/field-dependencies/schema.json, modulo the nullable anyOf delta', async () => {
    const { schema } = await import('./picklists/field-dependencies/schema.js');
    const result = toRootJsonSchema(schema);
    const expected = nullableTypeToAnyOf(readExpectedSchema('picklists/field-dependencies'));
    assert.deepStrictEqual(result, expected);
  });

  it('converts picklists/schema.ts to the same JSON Schema as picklists/schema.json, modulo the action rename and the internalised fieldDependencies $ref', async () => {
    const { schema } = await import('./picklists/schema.js');
    const result = toRootJsonSchema(schema);

    const expected = renameDefinition(readExpectedSchema('picklists'), 'action', 'picklistAction');
    const fieldDependenciesExpected = nullableTypeToAnyOf(readExpectedSchema('picklists/field-dependencies'));
    const { definitions: fieldDependenciesDefinitions, ...fieldDependenciesRoot } = fieldDependenciesExpected;
    (expected.properties as Record<string, unknown>).fieldDependencies = {
      allOf: [{ $ref: '#/definitions/fieldDependencies' }],
    };
    Object.assign(expected.definitions as Record<string, unknown>, fieldDependenciesDefinitions, {
      fieldDependencies: fieldDependenciesRoot,
    });

    assert.deepStrictEqual(result, expected);
  });

  it('given historyTrackingSchema uses .default([]) and listViewCustomButtonsSchema.buttons uses .meta({ default: [] }), when converted to JSON Schema, then the array root carries default: [] while the object property stays required', async () => {
    const { schema: historyTrackingArraySchema } = await import('./history-tracking/schema.js');
    const { listViewCustomButtonsSchema } = await import('./list-view-custom-buttons/schema.js');

    const historyTrackingResult = toRootJsonSchema(historyTrackingArraySchema);
    assert.deepStrictEqual(historyTrackingResult.default, []);

    const buttonsResult = toDefinitionJsonSchema(listViewCustomButtonsSchema) as {
      properties: { buttons: { default: unknown } };
      required: string[];
    };
    assert.deepStrictEqual(buttonsResult.properties.buttons.default, []);
    assert.ok(buttonsResult.required.includes('buttons'));
  });

  it('converts auth-providers/schema.ts to the same JSON Schema as auth-providers/schema.json, modulo the patternProperties -> propertyNames/additionalProperties delta', async () => {
    const { schema } = await import('./auth-providers/schema.js');
    const result = toRootJsonSchema(schema);
    const expected = patternPropertiesToRecord(readExpectedSchema('auth-providers'));
    assert.deepStrictEqual(result, expected);
  });

  it('given the auth-providers schema, when converted to JSON Schema, then consumerSecret carries x-password: true and consumerKey does not', async () => {
    const { schema } = await import('./auth-providers/schema.js');
    const result = toRootJsonSchema(schema) as {
      additionalProperties: { properties: { consumerSecret: { 'x-password'?: boolean }; consumerKey: unknown } };
    };
    assert.strictEqual(result.additionalProperties.properties.consumerSecret['x-password'], true);
    assert.strictEqual('x-password' in (result.additionalProperties.properties.consumerKey as object), false);
  });

  it('converts security/certificate-and-key-management/schema.ts to the same JSON Schema as its schema.json, modulo the integer bounds delta', async () => {
    const { schema } = await import('./security/certificate-and-key-management/schema.js');
    const result = toRootJsonSchema(schema);
    const expected = addIntegerBounds(
      readExpectedSchema('security/certificate-and-key-management'),
      'certificate',
      'keysize',
    );
    assert.deepStrictEqual(result, expected);
  });

  it('converts security/authentication-configuration/schema.ts to the same JSON Schema as its schema.json', async () => {
    const { schema } = await import('./security/authentication-configuration/schema.js');
    const result = toRootJsonSchema(schema);
    const expected = readExpectedSchema('security/authentication-configuration');
    assert.deepStrictEqual(result, expected);
  });

  it('given authenticationConfigurationSchema.services uses .meta({ default: [] }), when converted to JSON Schema, then services stays in required while also carrying default: []', async () => {
    const { schema } = await import('./security/authentication-configuration/schema.js');
    const result = toRootJsonSchema(schema) as { required: string[]; properties: { services: { default: unknown } } };
    assert.ok(result.required.includes('services'));
    assert.deepStrictEqual(result.properties.services.default, []);
  });

  it('converts security/schema.ts to the same JSON Schema as security/schema.json, modulo the cross-file sub-schema refs', async () => {
    const { schema } = await import('./security/schema.js');
    const result = toRootJsonSchema(schema);
    let expected = readExpectedSchema('security');
    expected = mergeExternalRef(
      expected,
      './certificate-and-key-management/schema.json',
      'certificateAndKeyManagement',
      addIntegerBounds(readExpectedSchema('security/certificate-and-key-management'), 'certificate', 'keysize'),
    );
    expected = mergeExternalRef(
      expected,
      './authentication-configuration/schema.json',
      'authenticationConfiguration',
      readExpectedSchema('security/authentication-configuration'),
    );
    assert.deepStrictEqual(result, expected);
  });

  it('converts service-channels/capacity/schema.ts to the same JSON Schema as its schema.json, modulo the missing-items delta', async () => {
    const { schema } = await import('./service-channels/capacity/schema.js');
    const result = toRootJsonSchema(schema);
    const expected = addMissingItems(readExpectedSchema('service-channels/capacity'), 'valuesForInProgress', {
      type: 'string',
    });
    assert.deepStrictEqual(result, expected);
  });

  it('converts service-channels/schema.ts to the same JSON Schema as service-channels/schema.json, modulo the capacity sub-schema ref and missing-items delta', async () => {
    const { schema } = await import('./service-channels/schema.js');
    const result = toRootJsonSchema(schema);
    const capacityExpected = addMissingItems(readExpectedSchema('service-channels/capacity'), 'valuesForInProgress', {
      type: 'string',
    });
    const expected = mergeExternalRef(
      readExpectedSchema('service-channels'),
      './capacity/schema.json',
      'capacity',
      capacityExpected,
    );
    assert.deepStrictEqual(result, expected);
  });

  it('converts permission-sets/service-presence-status/schema.ts to the same JSON Schema as its schema.json, modulo the missing-items delta', async () => {
    const { schema } = await import('./permission-sets/service-presence-status/schema.js');
    const result = toRootJsonSchema(schema);
    const expected = { ...readExpectedSchema('permission-sets/service-presence-status'), items: { type: 'string' } };
    assert.deepStrictEqual(result, expected);
  });

  it('converts permission-sets/schema.ts to the same JSON Schema as permission-sets/schema.json, modulo the servicePresenceStatuses sub-schema ref and missing-items delta', async () => {
    const { schema } = await import('./permission-sets/schema.js');
    const result = toRootJsonSchema(schema);
    const subExpected = {
      ...readExpectedSchema('permission-sets/service-presence-status'),
      items: { type: 'string' },
    };
    const expected = mergeExternalRef(
      readExpectedSchema('permission-sets'),
      './service-presence-status/schema.json',
      'servicePresenceStatuses',
      subExpected,
    );
    assert.deepStrictEqual(result, expected);
  });

  it('converts reports-and-dashboards/folder-sharing/schema.ts to the same JSON Schema as its schema.json', async () => {
    const { schema } = await import('./reports-and-dashboards/folder-sharing/schema.js');
    const result = toRootJsonSchema(schema);
    const expected = readExpectedSchema('reports-and-dashboards/folder-sharing');
    assert.deepStrictEqual(result, expected);
  });

  it('converts reports-and-dashboards/schema.ts to the same JSON Schema as reports-and-dashboards/schema.json, modulo the folderSharing sub-schema ref', async () => {
    const { schema } = await import('./reports-and-dashboards/schema.js');
    const result = toRootJsonSchema(schema);
    const subExpected = readExpectedSchema('reports-and-dashboards/folder-sharing');
    const expected = mergeExternalRef(
      readExpectedSchema('reports-and-dashboards'),
      './folder-sharing/schema.json',
      'folderSharing',
      subExpected,
    );
    assert.deepStrictEqual(result, expected);
  });

  it('converts salesforce-cpq-config/schema.ts to the same JSON Schema as salesforce-cpq-config/schema.json', async () => {
    const { schema } = await import('./salesforce-cpq-config/schema.js');
    const result = toRootJsonSchema(schema);
    const expected = readExpectedSchema('salesforce-cpq-config');
    assert.deepStrictEqual(result, expected);
  });
});
