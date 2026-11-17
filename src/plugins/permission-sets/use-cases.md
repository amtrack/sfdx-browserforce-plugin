## Support agents get the presence statuses of their team

Omni-Channel agents choose a presence status, such as "Available for cases" or "On a break", in the Omni-Channel widget, and they only see the statuses their profile or permission sets give access to. Litware gives them through the **permission set** of its support agents, and adds a status each time a new channel opens.

The access of a permission set to service presence statuses is not part of the `PermissionSet` metadata. This config moves the statuses `TestStatus` and `TestStatus2` (the API names of the statuses, here those of the test fixtures of this plugin) to the **enabled statuses** of the permission set, and removes the ones not listed.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "permissionSets": [
      {
        "permissionSetName": "ServicePresenceTest",
        "servicePresenceStatuses": [
          "TestStatus",
          "TestStatus2"
        ]
      }
    ]
  }
}
```
