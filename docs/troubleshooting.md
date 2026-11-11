---
title: Troubleshooting
description: Fix a missing browser, watch or record what Browserforce does in Salesforce Setup with Playwright traces, and tune timeouts and retries.
---

# Troubleshooting

## No browser installed

If no browser is installed or launching fails, you'll get an error message from Playwright with a suggestion.

Typically this will guide you to install a browser.
If you've installed sfdx-browserforce-plugin using `sf`, you can replace the following:

```diff
- npx playwright install chromium
+ sf browserforce playwright -- install chromium
```

See [Installation](installation.md) to use a browser that is already installed instead.

## Watch or record what the browser does

Browserforce uses [Playwright](https://playwright.dev/) to drive a browser through the Salesforce Setup pages.
When a setting fails to apply, these flags of `sf browserforce apply` (or their environment variables) help to see why:

| Flag | Environment variable | Effect |
| ---- | -------------------- | ------ |
| `--no-headless` | `BROWSERFORCE_HEADLESS=false` | shows the browser window |
| `--slow-mo 1000` | `BROWSERFORCE_SLOWMO=1000` | waits that many milliseconds between actions |
| `--trace` | `BROWSERFORCE_TRACE=true` | records a `trace-<timestamp>.zip` file |

Open a trace with `sf browserforce playwright -- show-trace trace-<timestamp>.zip`: it replays each step with screenshots, network calls and console messages.

## Timeouts and retries

Salesforce Setup pages can be slow. `--timeout`, `--max-retries` and `--retry-timeout` change how long Browserforce waits and how often it retries. See [`sf browserforce apply`](browserforce/apply.md).

## Still stuck?

Search the [issues](https://github.com/amtrack/sfdx-browserforce-plugin/issues) or open a new one, with the command output and, when you can, a trace.
