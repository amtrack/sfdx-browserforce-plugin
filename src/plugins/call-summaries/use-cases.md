## Summarize the sales calls with generative AI

The managers of Tailspin Toys no longer have time to listen to the recorded calls of their reps: they want Einstein to write a summary of each call, with its next steps and the feedback of the customer. Deploying `ConversationalIntelligenceSettings` with `enableCallSummarization` often fails with `OrgPreferences.GenECI`, and even when the setting reads `true`, the object that stores the summaries may not exist yet.

With `enabled: true`, Browserforce clicks **Turn On** in Setup > Salesforce Go > Call Summaries and waits until Salesforce has created that object. Einstein Conversation Insights must be on first, which the `einsteinConversationInsights` setting does. `enabled: false` turns the setting off through the Metadata API.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "callSummaries": {
      "enabled": true
    }
  }
}
```
