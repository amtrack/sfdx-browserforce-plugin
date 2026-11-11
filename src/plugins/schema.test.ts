import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { buildConfigJsonSchema } from '../plugin-catalog.js';
import { drivers, schemas } from './index.js';
import { rootSchema } from './schema.js';

describe('aggregate plugin schema', () => {
  it('given the schemas map and the driver exports, when compared by key, then they contain exactly the same set of keys', () => {
    const schemaKeys = Object.keys(schemas).toSorted();
    const driverKeys = Object.keys(drivers).toSorted();

    assert.deepStrictEqual(schemaKeys, driverKeys);
  });

  it('given the on-disk schema.json, when compared to buildConfigJsonSchema(), then they deep-equal', () => {
    const onDisk = JSON.parse(readFileSync(new URL('./schema.json', import.meta.url), 'utf8'));
    assert.deepStrictEqual(onDisk, buildConfigJsonSchema());
  });

  it('given the generated schema, when reading settings.properties, then it includes reportsAndDashboards and linkedInSalesNavigatorSettings', () => {
    const generated = z.toJSONSchema(rootSchema, { target: 'draft-7', io: 'input' }) as unknown as {
      properties: { settings: { properties: Record<string, unknown> } };
    };
    const keys = Object.keys(generated.properties.settings.properties);

    assert.ok(keys.includes('reportsAndDashboards'));
    assert.ok(keys.includes('linkedInSalesNavigatorSettings'));
  });
});
