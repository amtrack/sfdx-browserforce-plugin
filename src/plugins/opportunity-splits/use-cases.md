## Sales reps share the credit of the deals they close together

At Adventure Works, an account executive and a solution engineer often close a deal together, and the commission plan pays each of them a share of its revenue. Sales operations tracks those shares in a spreadsheet next to the CRM, and the quarterly commission run is always late.

Opportunity Splits stores the shares on the opportunity itself. The Metadata API cannot turn it on (`OpportunitySettings` only has `enableOpportunityTeam`), and Setup does it with a wizard: enable the feature, confirm the recalculation of the existing opportunities, then choose the page layouts that get the splits related list. This config runs the whole wizard, from **Set Up Opportunity Splits** to the default split types Revenue and Overlay, once Opportunity Teams are on (deploy the `Opportunity` settings with `enableOpportunityTeam` first, as the fixture of this plugin does).

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "opportunitySplits": {
      "enabled": true
    }
  }
}
```
