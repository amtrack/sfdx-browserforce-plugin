## Meetings are logged once for every contact who attended

The account managers of Proseware meet buying committees of four or five people. An event can only be related to one contact, so they either log the meeting once and the other attendees show no activity, or log it five times and the activity reports count five meetings.

**Allow Users to Relate Multiple Contacts to Tasks and Events** turns on Shared Activities: a task or an event can name up to 50 contacts. The `ActivitiesSettings` field of the Metadata API is read-only, so the setting can only be turned on in Setup, and only Salesforce Support can turn it off again: try it in a sandbox before applying this config to production.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "activitySettings": {
      "allowUsersToRelateMultipleContactsToTasksAndEvents": true
    }
  }
}
```
