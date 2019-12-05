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

> Note: Make sure to run these commands in your `sfdx-browserforce-plugin` directory.

```console
yarn install
```

## Scaffolding a new plugin

Let's say you want to develop a new plugin to enable/disable `Administrators Can Log in as Any User`.

You can scaffold a new plugin by running:

```console
yarn run generate:plugin --name AdminsCanLogInAsAnyUser
```

Run `git status` afterwards to see what files have been generated.

Bravo 👏, you have just generated a working browserforce plugin!

Want to see it in action?

Create a scratch org and try it yourself:

```console
sfdx force:org:create -f config/project-scratch-def.json -a browserforce-dev -s
BROWSER_DEBUG=true ./bin/run browserforce:apply -f src/plugins/admins-can-log-in-as-any-user/enable.json -u browserforce-dev
BROWSER_DEBUG=true ./bin/run browserforce:apply -f src/plugins/admins-can-log-in-as-any-user/disable.json -u browserforce-dev
```

Now it's your turn!

## Developing plugins

For the following, we assume that your scaffolded plugin lives in `src/plugins/admins-can-log-in-as-any-user`.

```console
$ tree src/plugins/admins-can-log-in-as-any-user
src/plugins/admins-can-log-in-as-any-user
├── disable.json        <-- example config file for e2e test
├── enable.json         <-- example config file for e2e test
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

Plugins are written in [Typescript](https://www.typescriptlang.org), just like `sfdx` and most of the available sfdx plugins.

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

## Debugging

The [Salesforce CLI Plug-In Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_plugins.meta/sfdx_cli_plugins/cli_plugins_debug.htm) describes debugging sfdx plugins using VS Code very well.

## Testing

To run **unit tests**:

> Note: Make sure to run these commands in your sfdx-browserforce-plugin directory.

```console
yarn test
```

To run the **end to end tests**, you might want to create a new **default scratch org** first.

> Note: Your default scratch org will be used in the tests!

```console
sfdx force:org:create -f config/project-scratch-def.json --setdefaultusername
```

```console
yarn run test:e2e
yarn run test:e2e -- -g "AdminsCanLogInAsAnyUser" # will only run tests matching `AdminsCanLogInAsAnyUser`
```

> Note: You can run the e2e tests in non-headless mode (opening a browser) by setting the environment variable `BROWSER_DEBUG=true`.
