## A long-lived org gets access levels on its report folders

Blue Yonder Airlines has used Salesforce since 2010. Its report and dashboard folders still use the legacy sharing: anyone who can see a folder can also save reports into it, so the finance dashboards get overwritten by copies made by other teams.

Enhanced folder sharing gives each folder Viewer, Editor and Manager access levels. Orgs created before Summer ’13 have to turn it on in Setup, and it cannot be turned off again. Applying this config to the old production org and to its full sandboxes aligns them with the scratch orgs of the developers, which always have it.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "reportsAndDashboards": {
      "folderSharing": {
        "enableEnhancedFolderSharing": true
      }
    }
  }
}
```
