# Contributing

## Getting Started

1. Fork this repository and clone your fork:

2. Install dependencies and link the sfdx plugin

> Note: Make sure to run these commands in your sfdx-browserforce-plugin directory.

```console
$ npm install
$ sfdx plugins:link .
```

## Writing plugins

In order to write a new plugin (e.g. `FooBar`),
you'll need to create/adjust the following files:

* `plugins/foobar.js`
* `test/foobar.js`
* `test/fixtures/enable-foobar.js`
* `test/fixtures/disable-foobar.js`
* `commands/shape-apply.js` (add to `DRIVERS`)

## Testing

To run the tests for the library itself:

> Note: Make sure to run these commands in your sfdx-browserforce-plugin directory.

```console
$ npm test
```

To run the tests for the plugins, you might want to create a new default scratch org first.

> Note: Your default scratch org will be used in the tests!

```console
$ sfdx force:org:create -f config/project-scratch-def.json -s
```

```console
$ TEST_INTEGRATION=true npm test
```

> Note: You can run the tests in non-headless mode (opening a browser) by setting the environment variable `BROWSER_DEBUG=true`.
