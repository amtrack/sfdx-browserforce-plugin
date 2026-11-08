---
title: Install sfdx-browserforce-plugin for the Salesforce CLI
description: Install the sfdx-browserforce-plugin sf CLI plugin, then a browser for Playwright or use an existing Chrome, to automate Salesforce Setup.
---

# Installation

```shell
sf plugins install sfdx-browserforce-plugin
```

!!! important "Playwright does not come with a browser automatically"

    You might need to install a browser explicitly or configure Browserforce to use an existing browser.

!!! tip "GitHub Actions"

    If you're using Browserforce on GitHub Actions with the `ubuntu-latest` (v24) image, the preinstalled Google Chrome is used automatically.
    No further configuration and installation needed, because the `CHROME_BIN` environment variable is already set.

## Option 1: Install a browser using our Playwright wrapper command

```shell
sf browserforce playwright -- install chromium
```

!!! important

    The two hyphens `--` are intentional and separate the sf command from the arguments to be passed to the playwright executable.

## Option 2: Configure Browserforce to use an existing browser

You can use any of the following environment variables:

```shell
BROWSERFORCE_BROWSER_CHANNEL="chrome"
BROWSERFORCE_BROWSER_CHANNEL="chromium"
BROWSERFORCE_BROWSER_EXECUTABLE_PATH="/usr/bin/google-chrome"
CHROME_BIN="/usr/bin/google-chrome"
```

## Alternative installation without `sf`

You can also install the `sfdx-browserforce-plugin` npm package without `sf`. The package exports a `sfdx-browserforce-plugin` executable:

```shell
npm install --save-dev sfdx-browserforce-plugin
npx sfdx-browserforce-plugin browserforce -h
```
