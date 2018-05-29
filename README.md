# sfdx-browserforce-plugin

> sfdx plugin for executing various tasks using browser automation

[![Build Status](https://travis-ci.org/amtrack/sfdx-browserforce-plugin.svg?branch=master)](https://travis-ci.org/amtrack/sfdx-browserforce-plugin)

## Installation

```console
$ sfdx plugins:install sfdx-browserforce-plugin
```

## Usage

```console
$ sfdx browserforce --help
Usage: sfdx browserforce:COMMAND

Help topics, type sfdx help TOPIC for more details:

 browserforce:shape  commands for shape
```

```console
$ sfdx browserforce:shape --help
sfdx browserforce:shape commands: (get help with sfdx help browserforce:shape:COMMAND)
 browserforce:shape:apply  apply an org shape
```

```console
$ sfdx browserforce:shape:apply --help
Usage: sfdx browserforce:shape:apply

apply an org shape

Flags:
 -f, --definitionfile DEFINITIONFILE  path to a browserforce definition file
 -u, --targetusername TARGETUSERNAME  username for the target org

help text for browserforce:shape:apply
```

## Examples

### Org Shape

Check and apply org shape for scratch orgs, sandboxes and production orgs

```console
$ sfdx browserforce:shape:apply -f config/browserforce-shape-def.json -u myscratchorg
```

The schema of the `config/browserforce-shape-def.json` is similar to `config/project-scratch-def.json`.

```json
"orgPreferences": {
    "enabled": [
      "ExternalSharing"
    ]
}
```

**Supported Org Preferences**

General Settings

* `CustomerPortal` (Warning: cannot be disabled once enabled)
* `SalesforceToSalesforce` (Warning: cannot be disabled once enabled)
* `AdminsCanLogInAsAny`

Sharing Settings

* `ExternalSharing` ([now officially supported](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_scratch_orgs_def_file_config_values.htm))

## Planned Features (contributions welcome)

**Org Preferences**

Live Agent Settings

* `LiveAgent`

Account Settings

* `AccountSharedAccounts` (Allow users to relate a contact to multiple accounts)

Contact Field History

* `ContactFieldHistory`

Omni-Channel Settings

* `OmniChannel`

Email-to-Case Settings

* `EmailToCase`

Email to Salesforce

* `EmailToSalesforce`

Entitlement Settings

* `MilestoneStoppedTime`

Campaign Influence Settings

* `CampaignInfluence`

**Company Information**

```json
{
  "language": "English",
  "locale": "German.*Germany",
  "timezone": "Berlin",
  "workflowUser": "User User"
}
```

**Changeset Management**

Create outbound changesets from a given `package.xml`.

```
$ sfdx browserforce:changeset:create -f src/package.xml -u myscratchorg
```

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for getting started.

## Sponsors

* [PARX](http://www.parx.com)
* [IPfolio](http://www.ipfolio.com)

## License

MIT © [Matthias Rolke](mailto:mr.amtrack@gmail.com)
