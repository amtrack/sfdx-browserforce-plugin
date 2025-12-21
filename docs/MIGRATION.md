# Migration Guide

## v6

### A deprecated flag has been removed

Please replace `--targetusername` (`-u`) with `--target-org` (`-o`)

### Puppeteer has been replaced with Playwright

Puppeteer automatically installed a compatible browser (Chrome for Testing) using the `postinstall` NPM lifecycle script.

While lifecycle scripts are handy, they come with security risks.

Playwright on the other hand does not install a browser automatically since [playwright@1.38](https://playwright.dev/docs/release-notes#breaking-changes-playwright-no-longer-downloads-browsers-automatically)

You now need to install a browser explicitly:

```shell
sf browserforce playwright -- install chromium
# or
sf browserforce playwright -- install chrome
```

or configure Browserforce to use an existing browser with one of the following environment variables:

```shell
PLAYWRIGHT_BROWSER_CHANNEL="chrome"
PLAYWRIGHT_BROWSER_CHANNEL="chromium"
# or
PLAYWRIGHT_EXECUTABLE_PATH="/usr/bin/google-chrome"
CHROME_BIN="/usr/bin/google-chrome"
```

If you maintain a fork of Browserforce, please see [`docs/PLAYWRIGHT.md`](./PLAYWRIGHT.md) for best practices or study the changes of v6.
