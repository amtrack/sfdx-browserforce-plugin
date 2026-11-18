## Turn on Conversation Insights in every new org of a pipeline

Tailspin Toys records the sales calls of its reps, and every new scratch org of the sales team needs Einstein Conversation Insights before Call Summaries and the recording providers can be set up. A deployment of `ConversationalIntelligenceSettings` with `enableCallCoaching` returns as soon as the setting is saved, while Salesforce goes on turning the feature on in the background, sometimes for more than 30 minutes: a step that needs its objects right after the deployment fails.

With `enabled: true`, Browserforce turns on **Conversation Insights** through the Metadata API, then waits until Salesforce has created the objects that store the conversations. The page can show the readiness as in progress for a while longer: the `callSummaries` setting waits for it. Conversation Insights cannot be turned off again.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "einsteinConversationInsights": {
      "enabled": true
    }
  }
}
```
