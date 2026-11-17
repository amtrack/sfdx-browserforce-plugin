## Track the history of Person Account fields

A wealth management firm keeps its private clients as Person Accounts, and its compliance officers must see who changed a client's birthdate or the custom fields of the person, and when. History tracking of a Person Account field is set on the Account, but the Metadata API only sets `trackHistory` on the Contact field, which does not reach its Person Account twin (`__pc`).

This config turns on the history of **Account** with **Enable Account History**, then tracks the fields of the person: the standard Birthdate (`PersonBirthdate`) and the custom field `Test__pc`. Fields are named by their API name as seen from the Account, with the `__pc` suffix for the custom fields of the person.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "historyTracking": [
      {
        "objectApiName": "Account",
        "enableHistoryTracking": true,
        "fieldHistoryTracking": [
          {
            "fieldApiName": "PersonBirthdate",
            "enableHistoryTracking": true
          },
          {
            "fieldApiName": "Test__pc",
            "enableHistoryTracking": true
          }
        ]
      }
    ]
  }
}
```
