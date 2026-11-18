## Delete retired record types

A rental company used to track sports cars and SUVs as Vehicle record types. Both were deactivated long ago, but they still clutter the record type lists, the reports and every profile. The Metadata API refuses to delete a record type ("Cannot delete record type through API"), and Setup only deletes an inactive one, asking which record type its records get instead.

This config deletes **Sports Car**, whose records become **Bike** records, and **Sport Utility Vehicle**, whose records lose their record type. Browserforce refuses to delete an active record type: deactivate it first with the Metadata API. Once deleted, a record type only comes back by deploying it again.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "recordTypes": {
      "deletions": [
        {
          "fullName": "Vehicle__c.SportsCar",
          "replacement": "Vehicle__c.Bicycle"
        },
        {
          "fullName": "Vehicle__c.SUV"
        }
      ]
    }
  }
}
```
