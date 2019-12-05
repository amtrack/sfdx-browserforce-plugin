---
to: src/plugins/index.ts
inject: true
before: export {
---
import * as <%= h.changeCase.camelCase(name) %> from './<%= h.changeCase.paramCase(name) %>';
