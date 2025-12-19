# sfdx-browserforce-plugin

> sfdx plugin to apply settings in the Salesforce Setup Menu using browser automation

[![Actions Status](https://github.com/amtrack/sfdx-browserforce-plugin/actions/workflows/default.yml/badge.svg?branch=main)](https://github.com/amtrack/sfdx-browserforce-plugin/actions?query=branch:main)

✅ Most settings in the Salesforce Setup Menu are represented as [Settings](https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_settings.htm) in the Metadata API.

For example, the highlighted checkbox "Show View Hierarchy link on account pages" in Account Settings is indeed represented in the Metadata `AccountSettings` as `showViewHierarchyLink`.

|                                                                                   |                                                                   |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| ![Account Settings in the Salesforce Setup Menu](./examples/account-settings.png) | ![AccountSettings Metadata](./examples/account-settings-meta.png) |

⚡ **BUT**

> Not all feature settings are available in the Metadata API. See [Unsupported Metadata Types](https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_unsupported_types.htm) for information on which feature settings are not available.
>
> Source: [Metadata API Developer Guide | Settings](https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_settings.htm)

For example, the Currency Locale in `Setup -> Company Settings -> Company Information` is not represented in any Metadata.

![unsupported setting for currency locale](examples/unsupported-currency-locale.png)

👉 This is where Browserforce (sfdx-browserforce-plugin) comes to the rescue. It fills this gap by applying these unsupported settings through browser automation!

# Example

To change the Currency Locale, the Browserforce config file (here: `./config/currency.json`) looks like this:

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

Apply the config:

```console
$ sf browserforce apply -f ./config/currency.json --target-org myOrg@example.com
  logging in... done
  Applying definition file ./config/currency.json to org myOrg@example.com
  [CompanyInformation] retrieving state... done
  [CompanyInformation] changing 'defaultCurrencyIsoCode' to '"English (South Africa) - ZAR"'... done
  logging out... done
```

# Key Concepts

- 🔧 configuration using JSON Schema (similar to the [Scratch Org Definition Configuration](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_scratch_orgs_def_file.htm))
- 🧠 idempotency of the `apply` command only applies what's necessary and allows re-execution (concept similar to [terraform](https://www.terraform.io/docs/commands/apply.html))
- 🏎️ browser automation powered by Playwright, [learn more about Playwright and Browserforce](#playwright)

# Supported Browserforce Settings

Top settings:

- Change Currency Locale
- Delete inactive record types
- Replace (and delete) picklist values
- Manage (create/modify/delete) Field Dependencies on CustomFields
- Set Email Deliverability Access Level to "No access", "System email only" and "All email"
- Enable the 'Sales Cloud for Slack' Slack App
- Change active Lightning Theme
- Enable Salesforce To Salesforce
- Import certificates from a keystore in Java Keystore (JKS) format

But there's more:

- Please see the [Browserforce Settings](https://github.com/amtrack/sfdx-browserforce-plugin/wiki/Browserforce-Settings) wiki page with screenshots.
- Explore the JSON schema powered configuration using a [full-blown example](https://github.dev/amtrack/sfdx-browserforce-plugin/blob/main/examples/full.json) or start with an [empty configuration](https://github.dev/amtrack/sfdx-browserforce-plugin/blob/main/examples/empty.json).

# Installation

There are several different methods to install `sfdx-browserforce-plugin`:

```shell
# as an sf plugin globally
sf plugins install sfdx-browserforce-plugin

# or standalone globally
npm install --global sfdx-browserforce-plugin

# or standalone locally (as a dependency in your Node.js project)
npm install --save-dev sfdx-browserforce-plugin
```

# Usage

Depending on your choice of installation, you can find the `browserforce` namespace:

```shell
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

# Environment Variables

- `BROWSER_DEBUG` run in non-headless mode (default: `false`)
- `BROWSERFORCE_NAVIGATION_TIMEOUT_MS`: adjustable for slow internet connections (default: `90000`)
- `BROWSERFORCE_RETRY_MAX_RETRIES`: number of retries on failures opening a page (default: `4`)
- `BROWSERFORCE_RETRY_TIMEOUT_MS`: initial time between retries in exponential mode (default: `4000`)

# Migration to Playwright

**Important Notice for Next Version Release:**

This project is transitioning from Puppeteer to Playwright for browser automation. The migration is planned for the next major version release.

## What This Means for Users

### Current Version (Puppeteer-based)
- Continues to work as expected
- No action required from users
- Maintained for stability

### Next Version (Playwright-based)
The upcoming release will include:

1. **Improved Reliability**: Playwright offers better auto-waiting and more robust element interaction
2. **Better Frame Support**: Native iframe handling without workarounds
3. **Enhanced Debugging**: Built-in trace viewer and inspector tools
4. **Modern API**: More intuitive locator-based API

### Migration Actions Required

**For Plugin Developers:**
If you've created custom plugins or extended this project:

1. **Update Browser Automation Code**:
   - Replace `page.$()` with `page.locator()`
   - Replace `page.$$()` with `page.locator().all()`
   - Update `ElementHandle` references to `Locator`
   - Review frame handling code (Playwright has better native support)

2. **Update Dependencies**:
   - Remove `puppeteer` dependency
   - Add `playwright` or `@playwright/test` dependency

3. **Review Documentation**:
   - See [`docs/PLAYWRIGHT.md`](docs/PLAYWRIGHT.md) for best practices

**For End Users:**
- No configuration changes required
- Browser download process remains similar
- Environment variables remain compatible
- All existing configuration files will continue to work

# Playwright

We use [Playwright](https://playwright.dev/) for browser automation which comes with its own Chromium browser.

The Playwright [installation guide](https://playwright.dev/docs/intro) describes how this works:

> Playwright comes with bundled browser binaries for Chromium, Firefox, and WebKit. When you install Playwright, it automatically downloads the Chromium browser to ensure consistent automation across different environments. The browser is downloaded to the OS-specific cache directory.

In most cases this just works! If you want to skip the download and use another browser installation, you can do this as follows:


For more information on browser automation best practices, see the [Playwright documentation](docs/PLAYWRIGHT.md).

Troubleshooting:

- The installation is triggered via the `postinstall` hook of npm/yarn. If you've disabled running scripts with npm (`--ignore-scripts` or via config file), it will not download the browser.
- If you encounter issues with browser downloads, you can manually install browsers with: `npx playwright install chromium`

# Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for getting started.

# Sponsors

- [PARX](https://www.parx.com)
- [IPfolio](https://www.ipfolio.com)

# License

MIT © [Matthias Rolke](mailto:mr.amtrack@gmail.com)
