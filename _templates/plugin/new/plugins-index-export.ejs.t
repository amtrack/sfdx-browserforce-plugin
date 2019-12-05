---
to: src/plugins/index.ts
inject: true
eof_last: false
after: export {
---
  <%= h.changeCase.camelCase(name) %>,
