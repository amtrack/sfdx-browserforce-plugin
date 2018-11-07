# Contributing

## Getting Started

1. Fork this repository and clone your fork:

2. Install dependencies

> Note: Make sure to run these commands in your sfdx-browserforce-plugin directory.

```console
yarn install
```

## Writing plugins

In order to write a new plugin (e.g. `FooBar`),
you'll need to create/adjust the following files:

**TIP: Simply copy an existing plugin directory**

- `src/plugins/foo-bar/index.ts`
- `src/plugins/foo-bar/index.e2e-spec.ts`
- `src/plugins/foo-bar/enable.json`
- `src/plugins/foo-bar/disable.json`

To register your plugin, add it to `DRIVERS` in

- `src/plugins/index.ts`

## Testing

To run the tests for the library itself:

> Note: Make sure to run these commands in your sfdx-browserforce-plugin directory.

```console
yarn test
```

To run the end to end tests, you might want to create a new default scratch org first.

> Note: Your default scratch org will be used in the tests!

```console
sfdx force:org:create -f config/project-scratch-def.json -s
```

```console
yarn run test:e2e
yarn run test:e2e -- -g "FooBar" # will only run your test
```

> Note: You can run the tests in non-headless mode (opening a browser) by setting the environment variable `BROWSER_DEBUG=true`.
