---
to: src/plugins/<%= h.changeCase.paramCase(name) %>/schema.json
---
{
  "$schema": "http://json-schema.org/draft-07/schema",
  "$id": "https://github.com/amtrack/sfdx-browserforce-plugin/src/plugins/<%= h.changeCase.paramCase(name) %>/schema.json",
  "title": "<%= h.changeCase.pascalCase(name) %> Settings",
  "type": "object",
  "properties": {
    "enabled": {
      "title": "Enable <%= h.changeCase.pascalCase(name) %>",
      "description": "The description you want to be displayed as toolip when the user is editing the configuration",
      "type": "boolean"
    }
  }
}
