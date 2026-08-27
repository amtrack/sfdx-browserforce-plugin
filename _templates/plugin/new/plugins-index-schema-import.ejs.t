---
to: src/plugins/index.ts
inject: true
before: export const schemas
---
import { schema as <%= h.changeCase.camelCase(name) %>Schema } from './<%= h.changeCase.paramCase(name) %>/schema.js';
