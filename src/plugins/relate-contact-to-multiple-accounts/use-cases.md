## Independent consultants work for several client accounts

Tailspin Consulting staffs freelance consultants on client projects. A consultant is a contact of their own company, but also works for two or three client accounts at a time, and the account managers want to see them on each of those accounts.

**Allow users to relate a contact to multiple accounts** creates the Account Contact Relationship object and the "Related Contacts" list for that. The `AccountSettings` metadata has a flag for it, but deploying it does not always make the object available, and the deployment of the fields and layouts that use it then fails. Enabling it in Setup with this config always works, before the metadata is deployed.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "relateContactToMultipleAccounts": {
      "enabled": true
    }
  }
}
```
