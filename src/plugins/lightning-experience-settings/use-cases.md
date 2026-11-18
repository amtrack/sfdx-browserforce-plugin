## Bring back the standard Salesforce theme after a rebranding pilot

During a pilot, the marketing team of Northwind Traders activated the **Salesforce Cosmos** theme in every sandbox. The pilot is over and each environment must go back to the standard **Lightning Blue** theme, whose API name is `Lightning`.

The Metadata API has an `activeThemeName` field in `LightningExperienceSettings`, but it can only activate custom themes: a deployment cannot switch an org back to a standard theme such as `Lightning`, `LightningLite` or `SalesforceCosmos`. With this config, the same deployment that ships the metadata restores the theme, and the check mark of the **Themes and Branding** page moves to the active theme.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "lightningExperienceSettings": {
      "activeThemeName": "Lightning"
    }
  }
}
```
