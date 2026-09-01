import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import { z } from 'zod';
import { rootSchema } from '../src/plugins/schema.js';

const target = new URL('../src/plugins/schema.json', import.meta.url);
const json = JSON.stringify(z.toJSONSchema(rootSchema, { target: 'draft-7', io: 'input' }), null, 2);
const config = await prettier.resolveConfig(fileURLToPath(target));
writeFileSync(target, await prettier.format(json, { ...config, filepath: 'schema.json' }));
