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
```

## Scaffolding a new plugin

Let's say you want to develop a new plugin to enable/disable `Administrators Can Log in as Any User`.
Please note that this is only an example. In fact this is supported in the Metadata API.

You can scaffold a new plugin by running:

```shell
npm run generate:plugin --name AdminsCanLogInAsAnyUser
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
BROWSER_DEBUG=true ./bin/run browserforce apply -f src/plugins/admins-can-log-in-as-any-user/enable.json
BROWSER_DEBUG=true ./bin/run browserforce apply -f src/plugins/admins-can-log-in-as-any-user/disable.json
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
└── schema.json         <-- schema for configuration
```

We'll start with `schema.json`.

#### Configuration Schema (`schema.json`)

Browserforce leverages [JSON schema](https://json-schema.org/learn/getting-started-step-by-step.html) (`schema.json`) for its configuration.

Example: Given you have defined the property `enabled` in your `schema.json` for your plugin `AdminsCanLogInAsAnyUser`, end users can create a browserforce configuration file looking like this (entry point: `settings -> adminsCanLogInAsAnyUser`).

**schema.json**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema",
  "$id": "https://github.com/amtrack/sfdx-browserforce-plugin/packages/admins-can-log-in-as-any-user/schema.json",
  "title": "Administrators Can Log in as Any User Settings",
  "type": "object",
  "properties": {
    "enabled": {
      "title": "Enable Administrators Can Log in as Any User",
      "description": "The description you want to be displayed as toolip when the user is editing the configuration",
      "type": "boolean"
    }
  }
}
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

#### Implementation (`index.ts`)

Plugins are written in [Typescript](https://www.typescriptlang.org), just like `sf` and most of the available sf plugins.

[Puppeteer](https://pptr.dev) is being used as a library for browser automation.
If you need more inspiration regarding Puppeteer, checkout [this curated list](https://github.com/transitive-bullshit/awesome-puppeteer) of awesome Puppeteer resources.

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

Both the result of the `retrieve` function and the argument of the `apply` function are objects in the format defined in your `schema.json`.
In this example, you would return `{enabled: boolean}` as part of `retrieve`, and expect `{enabled: boolean}` as argument in `apply`.

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
