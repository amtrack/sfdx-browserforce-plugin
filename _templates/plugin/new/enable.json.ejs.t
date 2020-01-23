---
to: src/plugins/<%= h.changeCase.paramCase(name) %>/enable.json
---
{
  "$schema": "../schema.json",
  "settings": {
    "<%= h.changeCase.camelCase(name) %>": {
      "enabled": true
    }
  }
}
