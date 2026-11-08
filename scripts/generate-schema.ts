import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import { buildConfigJsonSchema } from '../src/plugin-catalog.js';

const target = new URL('../src/plugins/schema.json', import.meta.url);
const json = JSON.stringify(buildConfigJsonSchema(), null, 2);
const config = await prettier.resolveConfig(fileURLToPath(target));
writeFileSync(target, await prettier.format(json, { ...config, filepath: 'schema.json' }));
