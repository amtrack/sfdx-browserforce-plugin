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

**TIP: Simply copy an existing plugin directory**

* `plugins/foo-bar/index.js`
* `plugins/foo-bar/index.spec.js`
* `plugins/foo-bar/enable.js`
* `plugins/foo-bar/disable.js`

To register your plugin, add it to `DRIVERS` in

* `commands/shape-apply.js`

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
$ npm run test:plugins
$ npm run test:plugins -- -g "FooBar" # will only run your test
```

> Note: You can run the tests in non-headless mode (opening a browser) by setting the environment variable `BROWSER_DEBUG=true`.
