---
title: "browserforce:plugins:validate"
description: "validate a Browserforce config without connecting to an org"
---
<!-- This file has been generated with command 'sf hardis:doc:plugin:generate'. Please do not update it manually or it may be overwritten -->
# browserforce:plugins:validate

## Description

Check a config file, or inline JSON, against the schemas of all settings and report every error with its path and the documentation page of the setting. Removed settings are reported with their migration instructions.

Values written as "${VAR}" are accepted in place of any value: they are environment variable references that "browserforce apply" resolves and checks before logging in. They are listed in the result. Write "$${VAR}" to keep the literal text "${VAR}".

The command exits with code 1 when the config is invalid; with --json, the result still lists the errors.

## Parameters

| Name                  |  Type   | Description                          | Default | Required | Options |
|:----------------------|:-------:|:-------------------------------------|:-------:|:--------:|:-------:|
| config                | option  | browserforce config as a JSON string |         |          |         |
| definitionfile<br/>-f | option  | path to a browserforce config file   |         |          |         |
| flags-dir             | option  | Import flag values from a directory. |         |          |         |
| json                  | boolean | Format output as json.               |         |          |         |

## Examples

```shell
$ sf browserforce plugins validate -f ./config/currency.json
```

```shell
$ sf browserforce plugins validate --config '{"settings":{"densitySettings":{"density":"Compact"}}}' --json
```


