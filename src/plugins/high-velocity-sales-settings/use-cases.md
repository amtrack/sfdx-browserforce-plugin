## A sales development team starts working with cadences

Contoso hires a team of sales development reps who call and email new leads following cadences: a sequence of steps with a work queue telling each rep who to contact next. Cadences and work queues come with Sales Engagement (formerly High Velocity Sales), and the team's developers already describe its options in `HighVelocitySalesSettings` metadata.

That metadata cannot turn the feature on for the first time: Salesforce requires a click on **Set Up and Enable Sales Engagement** in Setup, which then shows the toggle of the feature. This config clicks it in every new org, so the deployment of the cadences and of the settings that follow works without a manual step.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "highVelocitySalesSettings": {
      "setUpAndEnable": true
    }
  }
}
```
