---
title: "browserforce:plugins:list"
description: "list the settings Browserforce can apply"
---
<!-- This file has been generated with command 'sf hardis:doc:plugin:generate'. Please do not update it manually or it may be overwritten -->
# browserforce:plugins:list

## Description

Describe every setting (plugin) that can be used under "settings" in a Browserforce config file, without connecting to an org.

With --json, each setting comes with its documentation page (docUrl), its JSON Schema, a flat list of its fields ready to be prompted, examples, and warnings (irreversible changes, Classic-only features, org prerequisites). The settings that have been removed are listed with their migration instructions.

This output is meant for tools building Browserforce configurations, like sfdx-hardis deployment actions. Its "formatVersion" only changes when a field is removed or renamed.

## Parameters

| Name      |  Type   | Description                          | Default | Required | Options |
|:----------|:-------:|:-------------------------------------|:-------:|:--------:|:-------:|
| flags-dir | option  | Import flag values from a directory. |         |          |         |
| json      | boolean | Format output as json.               |         |          |         |

## Examples

```shell
$ sf browserforce plugins list
```

```shell
$ sf browserforce plugins list --json
```


