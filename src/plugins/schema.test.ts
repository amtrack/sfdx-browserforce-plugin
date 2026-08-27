import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { describe, it } from 'mocha';
import { z } from 'zod';
import * as drivers from './index.js';
import { schemas } from './index.js';
import { rootSchema } from './schema.js';

describe('aggregate plugin schema', () => {
  it('given the schemas map and the driver exports, when compared by key, then they contain exactly the same set of keys', () => {
    const schemaKeys = Object.keys(schemas).sort();
    const driverKeys = Object.keys(drivers)
      .filter((key) => key !== 'schemas')
      .sort();

    assert.deepStrictEqual(schemaKeys, driverKeys);
  });

  it('given the on-disk schema.json, when compared to z.toJSONSchema(rootSchema), then they deep-equal', () => {
    const onDisk = JSON.parse(readFileSync(new URL('./schema.json', import.meta.url), 'utf8'));
    const generated = z.toJSONSchema(rootSchema, { target: 'draft-7', io: 'input' });

    assert.deepStrictEqual(onDisk, generated);
  });

  it('given the generated schema, when reading settings.properties, then it has exactly 25 keys including reportsAndDashboards and linkedInSalesNavigatorSettings', () => {
    const generated = z.toJSONSchema(rootSchema, { target: 'draft-7', io: 'input' }) as unknown as {
      properties: { settings: { properties: Record<string, unknown> } };
    };
    const keys = Object.keys(generated.properties.settings.properties);

    assert.strictEqual(keys.length, 25);
    assert.ok(keys.includes('reportsAndDashboards'));
    assert.ok(keys.includes('linkedInSalesNavigatorSettings'));
  });
});
