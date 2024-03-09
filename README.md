# sfdx-browserforce-plugin

> sfdx plugin for browser automation

[![Actions Status](https://github.com/amtrack/sfdx-browserforce-plugin/workflows/Test%20and%20Release/badge.svg)](https://github.com/amtrack/sfdx-browserforce-plugin/actions)

Unlike the [Scratch Org Definition Configuration](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_scratch_orgs_def_file.htm) which can only be used **on the creation of a scratch org** (`sfdx force:org:create -f config/scratch-def.json`),
the _Browserforce Configuration_ allows to "shape" **any org**, (e.g. scratch org, sandbox or production org) with **similar preferences and unofficial preferences** that are not (yet) available in the _Scratch Org Definition Configuration_ or as _Metadata_ (`sf browserforce apply -f config/setup-admin-login-as-any.json -u myOrg@example.com`).

Further benefits:

- comfortable configuration using JSON Schema (similar to the [Scratch Org Definition Configuration](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_scratch_orgs_def_file.htm))
- idempotency of the `apply` command only applies what's necessary and allows re-execution (concept similar to [terraform](https://www.terraform.io/docs/commands/apply.html))
- browser automation powered by Puppeteer and "Chrome for Testing", [learn more about Puppeteer and Browserforce](#puppeteer)
- implement your own custom preferences (a.k.a. plugins; to be improved)

# Installation

There are several different methods to install `sfdx-browserforce-plugin`:

```console
# as an sf plugin globally
sf plugins install sfdx-browserforce-plugin

# or standalone globally
npm install --global sfdx-browserforce-plugin

# or standalone locally (as a dependency in your Node.js project)
npm install --save-dev sfdx-browserforce-plugin
```

# Usage

Depending on your choice of installation, you can find the `browserforce` namespace:

```console
# globally in the sf cli
sf browserforce

# globally in the sfdx-browserforce-plugin executable
sfdx-browserforce-plugin browserforce

# locally in the sfdx-browserforce-plugin executable (npx is awesome!)
npx sfdx-browserforce-plugin browserforce
```

```console
$ sfdx-browserforce browserforce -h
browser automation

USAGE
  $ sfdx-browserforce-plugin browserforce COMMAND

COMMANDS
  browserforce apply  apply a plan from a definition file
  browserforce plan   retrieve state and generate plan file
```

Both the `browserforce apply` and `browserforce plan` commands expect a config file and a target username or alias for the org.

# Example

To enable `Setup -> Security Controls -> Login Access Policies -> Administrators Can Log in as Any User`, the config file (here: `./config/setup-admin-login-as-any.json`) should look like this:

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "security": {
      "loginAccessPolicies": {
        "administratorsCanLogInAsAnyUser": true
      }
    }
  }
}
```

Tip: If you use _Visual Studio Code_, you can leverage tab completion to build the config (powered by the JSON Schema).

Next apply the config:

```console
$ sf browserforce apply -f ./config/setup-admin-login-as-any.json --target-org myOrg@example.com
  logging in... done
  Applying definition file ./config/setup-admin-login-as-any.json to org myOrg@example.com
  [Security] retrieving state... done
  [Security] changing 'loginAccessPolicies' to '{"administratorsCanLogInAsAnyUser":true}'... done
  logging out... done
```

# Supported Settings

See the [JSON Schema](src/plugins/schema.json) for all supported settings.

Here is a full blown example showing most of the supported settings in action:

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "communities": { "enabled": true },
    "customerPortal": { "enabled": true },
    "deferSharingCalculation": {
      "suspend": true
    },
    "highVelocitySalesSettings": {
      "setUpAndEnable": true
    },
    "homePageLayouts": {
      "homePageLayoutAssignments": [
        {
          "profile": "Standard User",
          "layout": "Home Page Default"
        },
        {
          "profile": "System Administrator",
          "layout": "DE Default"
        }
      ]
    },
    "picklists": {
      "picklistValues": [
        {
          "metadataType": "StandardValueSet",
          "metadataFullName": "LeadSource",
          "value": "Partner",
          "newValue": "Partner Referral"
        },
        {
          "metadataType": "CustomField",
          "metadataFullName": "Vehicle__c.Features__c",
          "value": "CD",
          "newValue": "Media",
          "absent": true
        },
        {
          "metadataType": "CustomField",
          "metadataFullName": "Vehicle__c.Features__c",
          "value": "CD",
          "newValue": "AC",
          "active": false
        }
      ]
    },
    "recordTypes": { "deletions": [{ "fullName": "Vehicle__c.SUV" }] },
    "salesforceToSalesforce": { "enabled": true },
    "security": {
      "loginAccessPolicies": { "administratorsCanLogInAsAnyUser": true },
      "sharing": { "enableExternalSharingModel": true }
    },
    "companyInformation": {
      "defaultCurrencyIsoCode": "English (Ireland) - EUR"
    }
  }
}
```

# Environment Variables

- `BROWSER_DEBUG` run in non-headless mode (default: `false`)
- `BROWSERFORCE_NAVIGATION_TIMEOUT_MS`: adjustable for slow internet connections (default: `90000`)
- `BROWSERFORCE_RETRY_MAX_RETRIES`: number of retries on failures opening a page (default: `4`)
- `BROWSERFORCE_RETRY_TIMEOUT_MS`: initial time between retries in exponential mode (default: `4000`)

# Puppeteer

We use [Puppeteer](https://github.com/puppeteer/puppeteer) for browser automation which comes with its own "Chrome for Testing" browser.

The puppeteer [installation doc](https://github.com/puppeteer/puppeteer#installation) describes how this works:

> When you install Puppeteer, it automatically downloads a recent version of
> [Chrome for Testing](https://goo.gle/chrome-for-testing) (~170MB macOS, ~282MB Linux, ~280MB Windows) that is [guaranteed to
> work](https://pptr.dev/faq#q-why-doesnt-puppeteer-vxxx-work-with-chromium-vyyy)
> with Puppeteer. The browser is downloaded to the `$HOME/.cache/puppeteer` folder
> by default (starting with Puppeteer v19.0.0).

In most of the cases this just works! If you still want to skip the download and use another browser installation, you can do this as follows:

```console
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
sf plugins install sfdx-browserforce-plugin
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
sf browserforce:apply ...
```

Troubleshooting:

- The installation is triggered via the `postinstall` hook of npm/yarn. If you've disabled running scripts with npm (`--ignore-scripts` or via config file), it will not download the browser.

# Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for getting started.

# Sponsors

- [PARX](https://www.parx.com)
- [IPfolio](https://www.ipfolio.com)

# License

MIT © [Matthias Rolke](mailto:mr.amtrack@gmail.com)
