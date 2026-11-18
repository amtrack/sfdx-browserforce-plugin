---
to: src/plugins/<%= h.changeCase.paramCase(name) %>/use-cases.md
---
## Turn on <%= h.changeCase.sentenceCase(name) %> in every new org

The story of an admin (a named company, its need, why the Metadata API cannot do it), and what the config changes.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "<%= h.changeCase.camelCase(name) %>": {
      "enabled": true
    }
  }
}
```
