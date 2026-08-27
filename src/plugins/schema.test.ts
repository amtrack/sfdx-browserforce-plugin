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
});
