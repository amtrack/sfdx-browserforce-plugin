## New administrators get their permission sets automatically

Every time Fourth Coffee hires a Salesforce administrator, someone forgets one of the permission sets they need. The team describes the rule in a user access policy, `Grant_Permissions`: users with the System Administrator profile get the admin permission sets. The policy is deployed with the rest of the metadata, but the Metadata API cannot switch it on: a policy deployed with the status `Active` is saved as `Design`, and no metadata runs it for the existing users.

This config automates the policy so that it runs whenever a matching user is **created**, and runs **Apply Policy** once ("Apply To All") for the administrators who already exist. Apply To All cannot be undone and runs again at every apply, so keep it out of the config once the existing users have their access.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "userAccessPolicies": {
      "accessPolicies": [
        {
          "apiName": "Grant_Permissions",
          "active": true,
          "on": "Create",
          "applyToAll": true
        }
      ]
    }
  }
}
```
