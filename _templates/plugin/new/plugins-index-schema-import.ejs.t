---
to: src/plugins/index.ts
inject: true
before: export {
---
import { <%= h.changeCase.camelCase(name) %>Schema } from './<%= h.changeCase.paramCase(name) %>/index.js';
