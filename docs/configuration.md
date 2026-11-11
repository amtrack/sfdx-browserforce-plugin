---
title: Configuration file, environment variables and validation
description: Write a Browserforce JSON config file, keep secrets in environment variables, validate it without an org and apply it idempotently to a Salesforce org.
---

# Configuration

A Browserforce config file is a JSON file whose `settings` object holds one key per setting to apply.
The [Settings](settings/index.md) section describes each of them, with examples.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "companyInformation": {
      "defaultCurrencyIsoCode": "English (South Africa) - ZAR"
    }
  }
}
```

Apply it to an org:

```shell
sf browserforce apply -f ./config/currency.json --target-org myOrg@example.com
```

## Key concepts

- 🔧 **JSON Schema**: the `$schema` line gives completion, validation and documentation links in editors like VS Code, similar to the [Scratch Org Definition Configuration](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_scratch_orgs_def_file.htm).
  Start from an [empty configuration](https://github.com/amtrack/sfdx-browserforce-plugin/blob/main/examples/empty.json) or explore a [full-blown example](https://github.com/amtrack/sfdx-browserforce-plugin/blob/main/examples/full.json).
- 🧠 **Idempotency**: `apply` reads the current state of the org first and only changes what differs, so it can be run again and again (a concept similar to [terraform](https://developer.hashicorp.com/terraform/cli/commands/apply)).
  A second run with the same config reports `no action necessary`.
- 👀 **Dry run**: `sf browserforce apply --dry-run` shows the changes it would make without applying them.
- 🏎️ **Browser automation** powered by [Playwright](https://playwright.dev/), for the settings that the Metadata API does not support.

## Environment variables in config files

A value written exactly as `"${VARIABLE_NAME}"` is read from the environment variable `VARIABLE_NAME` when running `sf browserforce apply`. Use it to keep secrets out of config files, for example in a CI pipeline:

```json
{
  "settings": {
    "authProviders": {
      "MyAuthProvider": {
        "consumerKey": "my-consumer-key",
        "consumerSecret": "${MY_AUTH_PROVIDER_SECRET}"
      }
    }
  }
}
```

- The value is converted to the type the setting expects: `true`/`false` for a checkbox, a number, or JSON for a list or an object.
- A variable that is not set, or empty, stops the command before logging in, naming the setting and the variable.
- Values coming from environment variables are shown as `****` in the output.
- Only a value that is exactly `${NAME}` is replaced: `"prefix-${NAME}"` stays as written.
- To keep the literal text `${NAME}` as a value, write `$${NAME}`.

## Describe and validate settings without an org

- `sf browserforce plugins list --json` describes every setting: its documentation page (`docUrl`), its JSON Schema, its fields, examples, and warnings (irreversible changes, Classic-only features, org prerequisites). Tools building Browserforce configurations, like [sfdx-hardis](https://sfdx-hardis.cloudity.com/) deployment actions, read it.
- `sf browserforce plugins validate -f ./config/currency.json` checks a config file and reports each error with its path and the documentation page of the setting. Environment variable references are accepted and listed.
- `sf browserforce apply --json` returns the planned changes of each setting (applied, or only planned with `--dry-run`), with secrets and values from environment variables masked.

See the [Commands](commands.md) reference for every flag.
