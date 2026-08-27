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

function readExpectedSchema(dir: string): unknown {
  const json = JSON.parse(readFileSync(new URL(`./${dir}/schema.json`, import.meta.url), 'utf8')) as Record<
    string,
    unknown
  >;
  delete json.$schema;
  delete json.$id;
  return json;
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
});
