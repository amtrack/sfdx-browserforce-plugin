---
to: src/plugins/index.ts
inject: true
after: "import { z } from 'zod';"
sh: 'npx prettier --write "src/plugins/<%= h.changeCase.paramCase(name) %>/*" "src/plugins/index.ts" && npm run generate:schema'
---
import { <%= h.changeCase.pascalCase(name) %> as <%= h.changeCase.camelCase(name) %>, <%= h.changeCase.camelCase(name) %>Schema } from './<%= h.changeCase.paramCase(name) %>/index.js';
