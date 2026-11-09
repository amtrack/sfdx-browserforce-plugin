---
title: "browserforce:apply"
description: "apply a plan from a config file"
---
<!-- This file has been generated with command 'sf hardis:doc:plugin:generate'. Please do not update it manually or it may be overwritten -->
# browserforce:apply

## Description

apply a plan from a config file

With --json, the result lists each setting in the order applied, with its planned changes (secrets and values from environment variables shown as ****, null when no action is necessary) and whether they were applied.

## Parameters

| Name                    |  Type   | Description                                                                                                                                    | Default | Required | Options |
|:------------------------|:-------:|:-----------------------------------------------------------------------------------------------------------------------------------------------|:-------:|:--------:|:-------:|
| browser-channel         | option  | Playwright will try to figure out the path to the browser executable automatically.                                                            |         |          |         |
| browser-executable-path | option  | Note: The environment variable CHROME_BIN can also be used. On GitHub Actions with ubuntu-latest, CHROME_BIN is set to /usr/bin/google-chrome. |         |          |         |
| definitionfile<br/>-f   | option  | path to a browserforce config file                                                                                                             |         |          |         |
| dry-run<br/>-d          | boolean | Retrieve the config and show the diff, but don't apply it.                                                                                     |         |          |         |
| flags-dir               | option  | Import flag values from a directory.                                                                                                           |         |          |         |
| headless                | boolean | run in headless mode (default: true)                                                                                                           |         |          |         |
| json                    | boolean | Format output as json.                                                                                                                         |         |          |         |
| max-retries             | option  | the maximum number of retries for retryable actions                                                                                            |    6    |          |         |
| retry-timeout           | option  | the inital timeout in milliseconds for retryable actions (exponentially increased)                                                             |  4000   |          |         |
| slow-mo                 | option  | slow motion in milliseconds (default: 0)                                                                                                       |         |          |         |
| target-org<br/>-o       | option  | Username or alias of the target org. Not required if the `target-org` configuration variable is already set.                                   |         |   true   |         |
| timeout                 | option  | the default navigation timeout in milliseconds                                                                                                 |  90000  |          |         |
| trace                   | boolean | The trace file can be viewed with "sf browserforce playwright -- show-trace trace-<date>.zip".                                                 |         |          |         |

## Examples

```shell
$ sf browserforce apply -f ./config/currency.json --target-org myOrg@example.com
  logging in... done
  Applying config file ./config/currency.json to org myOrg@example.com
  [CompanyInformation] retrieving state... done
  [CompanyInformation] changing 'defaultCurrencyIsoCode' to '"English (South Africa) - ZAR"'... done
  logging out... done
  
```


