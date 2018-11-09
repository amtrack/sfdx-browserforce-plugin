# sfdx-browserforce-plugin

> sfdx plugin for executing various tasks using browser automation

[![Build Status](https://travis-ci.org/amtrack/sfdx-browserforce-plugin.svg?branch=master)](https://travis-ci.org/amtrack/sfdx-browserforce-plugin)

# Installation

Install either globally (and use it via `sfdx browserforce`)

```console
sfdx plugins:install sfdx-browserforce-plugin
```

or in your project as a dev dependency (and use it via `npx sfdx-browserforce-plugin browserforce`).

```console
npm install --save-dev sfdx-browserforce-plugin
```

# Usage

```console
sfdx browserforce -h
npx sfdx-browserforce-plugin browserforce -h
```

# Commands

<!-- commands -->
* [`sfdx-browserforce-plugin browserforce:shape:apply`](#sfdx-browserforce-plugin-browserforceshapeapply)

## `sfdx-browserforce-plugin browserforce:shape:apply`

check and apply an org shape

```
USAGE
  $ sfdx-browserforce-plugin browserforce:shape:apply

OPTIONS
  -f, --definitionfile=definitionfile             path to a browserforce definition file
                                                  The schema is similar to the scratch org definition file.
                                                  See
                                                  https://github.com/amtrack/sfdx-browserforce-plugin#supported-org-pref
                                                  erences for supported values.

  -u, --targetusername=targetusername             username or alias for the target org; overrides default target org

  --apiversion=apiversion                         override the api version used for api requests made by this command

  --json                                          format output as json

  --loglevel=(trace|debug|info|warn|error|fatal)  logging level for this command invocation

EXAMPLE
  $ sfdx browserforce:shape:apply -f ./config/browserforce-shape-def.json --targetusername myOrg@example.com
     Applying plan file ./config/browserforce-shape-def.json to org myOrg@example.com
     logging in... done
     [LoginAccessPolicies] retrieving state... done
     [LoginAccessPolicies] changing 'administratorsCanLogInAsAnyUser' to 'true'... done
     logging out... done
```

_See code: [src/commands/browserforce/shape/apply.ts](https://github.com/amtrack/sfdx-browserforce-plugin/blob/v0.0.0-development/src/commands/browserforce/shape/apply.ts)_
<!-- commandsstop -->

# Example

To enable `Login Access Policies -> Administrators Can Log in as Any User`, the config file (here: `./config/browserforce-shape-def.json`) should look like this:

```json
{
  "settings": {
    "loginAccessPolicies": {
      "administratorsCanLogInAsAnyUser": true
    }
  }
}
```

# Supported Settings

See the [JSON Schema](src/plugins/schema.json) for supported settings.

# Environment Variables

- `BROWSERFORCE_NAVIGATION_TIMEOUT_MS`: adjustable for slow internet connections (default: `90000`)
- `BROWSER_DEBUG` run in non-headless mode (default: `false`)

# Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for getting started.

# Sponsors

- [PARX](https://www.parx.com)
- [IPfolio](https://www.ipfolio.com)

# License

MIT © [Matthias Rolke](mailto:mr.amtrack@gmail.com)
