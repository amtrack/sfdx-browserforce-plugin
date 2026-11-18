## Account executives research buyers without leaving Salesforce

The account executives of Fabrikam use LinkedIn Sales Navigator to find the decision makers of their prospects. They switch between the two tools all day, and the contacts they find never reach the CRM.

Turning on the **Sales Navigator integration** adds the Sales Navigator components to account, contact and lead pages, so reps see the buying committee and send InMails from the record. No Metadata API settings type holds this toggle, and turning it on also asks the admin to accept the terms of the integration: this config does both in every org of the team.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "linkedInSalesNavigatorSettings": {
      "enabled": true
    }
  }
}
```
