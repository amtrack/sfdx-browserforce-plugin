---
to: src/plugins/index.ts
inject: true
eof_last: false
after: "const drivers = {"
---
  <%= h.changeCase.camelCase(name) %>,
