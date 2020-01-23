---
to: src/plugins/schema.json
inject: true
eof_last: false
after: "      \"properties\": {"
---
        "<%= h.changeCase.camelCase(name) %>": {
          "$ref": "./<%= h.changeCase.paramCase(name) %>/schema.json"
        },
