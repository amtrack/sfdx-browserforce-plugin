# Contributing

> Any type of contribution is welcome.
>
> It does not have to be a new plugin,
>
> anything like reporting bugs, improving the docs, submitting an idea for a new feature or plugin is appreciated.
>
> You can also sponsor the development to give back to the community, just like other companies did already.
>
> Sponsors are listed in the README.

## Getting Started

1. Fork this repository and clone your fork

2. Install dependencies

> [!NOTE]
> Make sure to run these commands in your `sfdx-browserforce-plugin` directory.

```shell
npm ci
npx playwright install chromium
```

## Scaffolding a new plugin

Let's say you want to develop a new plugin to enable/disable `Administrators Can Log in as Any User`.
Please note that this is only an example. In fact this is supported in the Metadata API.

You can scaffold a new plugin by running:

```shell
npm run generate:plugin -- --name AdminsCanLogInAsAnyUser
```

Bravo 👏, you have just generated a working browserforce plugin!

## Building

TypeScript code needs to be transpiled to JavaScript.
To do this, run the following command:

```shell
npm run build
```

Want to see it in action?

Let's create a Scratch Org

```shell
npm run develop
```

and now we can run it:

```shell
BROWSERFORCE_HEADLESS=false ./bin/run browserforce apply -f src/plugins/admins-can-log-in-as-any-user/enable.json
BROWSERFORCE_HEADLESS=false ./bin/run browserforce apply -f src/plugins/admins-can-log-in-as-any-user/disable.json
```

> [!TIP]
> Instead of manually running these commands while developing, we will run the E2E tests instead:

```shell
npm run test:e2e -- -g "AdminsCanLogInAsAnyUser"
  AdminsCanLogInAsAnyUser
    ✔ should enable
    ✔ should already be enabled
    ✔ should disable
    ✔ should already be disabled
  4 passing (6s)
```

## Developing plugins

For the following, we assume that your scaffolded plugin lives in `src/plugins/admins-can-log-in-as-any-user`.

```shell
$ tree src/plugins/admins-can-log-in-as-any-user
src/plugins/admins-can-log-in-as-any-user
├── disable.json        <-- example config file for manual testing
├── enable.json         <-- example config file for manual testing
├── index.e2e-spec.ts   <-- end-to-end test
├── index.ts            <-- implementation
└── schema.ts           <-- schema for configuration (zod)
```

We'll start with `schema.ts`.

#### Configuration Schema (`schema.ts`)

Browserforce leverages [zod](https://zod.dev) (`schema.ts`) for its configuration. The plugin's `Config` type
is derived from the schema with `z.infer<typeof schema>`, so the type and the schema cannot drift.

Example: Given you have defined the property `enabled` in your `schema.ts` for your plugin `AdminsCanLogInAsAnyUser`, end users can create a browserforce configuration file looking like this (entry point: `settings -> adminsCanLogInAsAnyUser`).

**schema.ts**

```ts
import { z } from 'zod';

export const schema = z
  .object({
    enabled: z
      .boolean()
      .meta({
        title: 'Enable Administrators Can Log in as Any User',
        description: 'The description you want to be displayed as toolip when the user is editing the configuration',
      })
      .optional(),
  })
  .meta({ id: 'adminsCanLogInAsAnyUser', title: 'Administrators Can Log in as Any User Settings' });
```

**config/setup-admin-login-as-any.json**

```json
{
  "$schema": "",
  "settings": {
    "adminsCanLogInAsAnyUser": {
      "enabled": true
    }
  }
}
```

The entry point (key) is automatically determined by the plugin name (starting lowercase).
This allows to run multiple actions (from multiple plugins) using a single configuration file.

`src/plugins/schema.json` is **generated** from all plugin schemas by `npm run generate:schema` (also run by
`npm run build` and by the plugin scaffolder), is committed, and must never be edited by hand; CI fails if the
committed file differs from the generated one.

If your plugin has a secret configuration field (e.g. an API key or password), wrap it with the `password()`
helper exported from `src/plugins/utils.ts`, e.g. `consumerSecret: password(z.string()).optional()`. Its value is
then masked in `browserforce apply` output.

#### Implementation (`index.ts`)

Plugins are written in [Typescript](https://www.typescriptlang.org), just like `sf` and most of the available sf plugins.

[Playwright](https://playwright.dev) is being used as a library for browser automation.
If you need more inspiration regarding Playwright, checkout the [official documentation](https://playwright.dev/docs/intro) and our [best practices guide](./docs/PLAYWRIGHT.md).

The simplified browserforce plugin lifecycle can be described as follows

**pseudo code**

```text
currentState = retrieve()
plan = diff(currentState, userconfig)
if (plan) {
  apply(plan)
}
```

**text**

> Retrieve the current state from the org (using browser automation or any available API that helps).
>
> Compare the current state with the target state (user config) and determine necessary actions (plan).
>
> Apply the given actions of the plan (described as JSON schema) if there are any.

Your plugin is required to implement the `retrieve` and `apply` function. In most cases, you don't have to implement `diff` yourself.

Now, this concept might seem superfluous at first, but it is important as it enforces idempotency:
The execution will apply as few changes as necessary and so you will be able to re-execute the `apply` command leading to the same result without any failure.

Both the result of the `retrieve` function and the argument of the `apply` function are objects in the format defined in your `schema.ts`.
In this example, you would return `{enabled: boolean}` as part of `retrieve`, and expect `{enabled: boolean}` as argument in `apply`.

### Formatting

After plugin development is completed, run the following command to ensure your code adheres to the project's style guidelines:

```shell
npm run format
```

This will automatically format your TypeScript and configuration files (e.g., indentation, line breaks, trailing commas) to maintain consistency across the codebase.

## Testing

To run **unit tests**:

> [!NOTE]
> Make sure to run these commands in your sfdx-browserforce-plugin directory.

```shell
npm run test
```

To run **end to end tests**:

> [!CAUTION]
> Your default scratch org will be used in the E2E tests!

```shell
npm run test:e2e -- -g "AdminsCanLogInAsAnyUser" # will only run tests matching `AdminsCanLogInAsAnyUser`
```

> [!IMPORTANT]
> E2E tests should be implemented to be **re-runnable**.
>
> Please run the test at least 7 times to reduce the risk of a flaky implementation:

```shell
for i in {1..7}; do npm run test:e2e -- -g "AdminsCanLogInAsAnyUser"; done
```

## Debugging

The [Salesforce CLI Plug-In Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_plugins.meta/sfdx_cli_plugins/cli_plugins_debug.htm) describes debugging sfdx plugins using VS Code very well.

### Playwright Debugging and Tracing

When developing or debugging Playwright-based plugins, you have several tools at your disposal:

#### Visual Debugging

To see the browser while tests run:

```bash
BROWSERFORCE_HEADLESS=false npm run test:e2e -- --grep "YourPlugin"
```

To slow down execution for better observation (value in milliseconds):

```bash
BROWSERFORCE_SLOWMO=1000 npm run test:e2e -- --grep "YourPlugin"
```

#### Playwright Tracing

Playwright tracing captures detailed information about test execution including screenshots, DOM snapshots, network activity, and console logs. This is invaluable for debugging test failures.

To generate a trace for a specific test:

```bash
BROWSERFORCE_TRACE=true npm run test:e2e -- --grep "YourPlugin"
```

After the test completes, a trace file will be saved with a timestamp (e.g., `trace-2025-11-23T19-00-00-000Z.zip`).

To view the trace:

```bash
npx playwright show-trace trace-2025-11-23T19-00-00-000Z.zip
```

This opens an interactive viewer in your browser where you can step through each action, view screenshots and DOM snapshots, inspect network requests, and review console logs.
