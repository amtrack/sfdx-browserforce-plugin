## Case capacity follows the status of the case

Litware turned on the status-based capacity model in `omniChannelSettings`. Its case channel still uses the tab-based **capacity model**, so the change has no effect yet: each case channel must say which field tells the status of the work and which of its values mean "in progress".

This config switches the channel to status-based capacity on the **Status field** of the case, counts `New`, `Working` and `Escalated` cases as **in progress**, and checks the agent's capacity again when a closed case is **reopened** or a case is **reassigned**. The `ServiceChannel` metadata of the API versions most projects deploy with has no capacity fields, so the deployment of the channel is followed by this config.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "serviceChannels": [
      {
        "serviceChannelDeveloperName": "CaseTest",
        "capacity": {
          "capacityModel": "StatusBased",
          "statusField": "Case.Status",
          "valuesForInProgress": [
            "New",
            "Working",
            "Escalated"
          ],
          "checkAgentCapacityOnReopenedWorkItems": true,
          "checkAgentCapacityOnReassignedWorkItems": true
        }
      }
    ]
  }
}
```
