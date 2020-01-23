---
to: src/plugins/<%= h.changeCase.paramCase(name) %>/disable.json
---
{
  "$schema": "../schema.json",
  "settings": {
    "<%= h.changeCase.camelCase(name) %>": {
      "enabled": false
    }
  }
}
