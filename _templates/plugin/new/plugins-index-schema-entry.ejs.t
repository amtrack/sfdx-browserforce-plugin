---
to: src/plugins/index.ts
inject: true
eof_last: false
after: "export const schemas"
---
  <%= h.changeCase.camelCase(name) %>: <%= h.changeCase.camelCase(name) %>Schema,
