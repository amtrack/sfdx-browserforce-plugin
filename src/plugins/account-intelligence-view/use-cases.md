## Account managers review their whole portfolio in one view

Northwind Traders runs quarterly account reviews: each account manager walks through the activity, open opportunities and cases of the accounts they own. Opening the accounts one by one takes hours, so the sales operations team wants the Account Intelligence view, a list of accounts with their key metrics and recent changes side by side.

The view is switched on by the **Account Intelligence toggle** in Setup. The Metadata API cannot do it: `AccountIntelligenceSettings` only holds the logos, news and automated fields of the accounts, not this toggle. With this config, every new sandbox and scratch org of the sales team gets the view, so the reviews can be rehearsed and the related customizations tested before they reach production.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "accountIntelligenceView": {
      "enable": true
    }
  }
}
```
