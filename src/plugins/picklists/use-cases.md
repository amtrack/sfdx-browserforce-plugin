## Rename the API name of a value, with the records that hold it

Acme connects a marketing automation tool that only accepts lead sources without spaces, and its **Lead Source** picklist has a value whose API name is **Partner Referral**. The sales reps must go on seeing the same label, and the thousands of existing leads must keep their source. Deploying the value set with a value renamed to `Partner_Referral` does not rename anything: the Metadata API creates a new value, and every lead keeps the old one. Only the **Edit** page of the value in Setup changes its API name in place, and Salesforce then updates the records that hold it.

With `newApiName`, Browserforce renames the API name to **Partner_Referral** and keeps the label. An inactive value has no Edit link: Browserforce activates it, renames it and deactivates it again. Once `Partner_Referral` exists, a second `apply` does nothing, and it fails before changing anything when another value already has the new API name or when the org forbids changing API names.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "picklists": {
      "picklistValues": [
        {
          "metadataType": "StandardValueSet",
          "metadataFullName": "LeadSource",
          "value": "Partner Referral",
          "newApiName": "Partner_Referral"
        }
      ]
    }
  }
}
```

## Rename the API name and the label of a value

The dealer's new telematics partner sends the features of each car with its own codes, and expects `Satnav` where the **Features** field stores **Navigation**. The sales team takes the occasion to give the value a clearer label, and both changes must reach every org of the dealer, with the Vehicles that hold the value.

Next to `newApiName`, which renames the API name to **Satnav** in place as in the use case above, `newLabel` changes the label users see to **Satellite Navigation** in the same edit. With `newLabel`, a second `apply` also checks the label, and only changes it when it differs.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "picklists": {
      "picklistValues": [
        {
          "metadataType": "CustomField",
          "metadataFullName": "Vehicle__c.Features__c",
          "value": "Navigation",
          "newApiName": "Satnav",
          "newLabel": "Satellite Navigation"
        }
      ]
    }
  }
}
```

## Add a contract status with its category

At Acme, every contract goes through the legal team before it is activated. The **Contract Status** picklist needs a step **Under Legal Review**, and each contract status belongs to a **Status Category**, `Draft`, `Activated` or `Expired`, which drives what users can do with the contract. The `StandardValue` type of the Metadata API has no field for the status category, so a deployment cannot create such a status.

Set `statusCategory` with `newValue` on a status picklist (contracts, orders): Browserforce creates the value on its Setup page and picks the category there. A second `apply` finds the value and does nothing.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "picklists": {
      "picklistValues": [
        {
          "metadataType": "StandardValueSet",
          "metadataFullName": "ContractStatus",
          "newValue": "Under Legal Review",
          "statusCategory": "Draft"
        }
      ]
    }
  }
}
```

## Replace a value in the records, keeping the old one

The marketing team of Acme merged its call channels: the leads that came by phone, like Thandi Ndlovu's, now count under Other. The **Replace** button of a picklist page rewrites a value in every record that holds it; the Metadata API only deploys the list of values, and never touches the records.

This config replaces **Phone Inquiry** with **Other** in the Lead Source of every lead. Without `active` or `absent`, the old value stays in the picklist, active, for the processes that still read it. Replacing is not idempotent: every `apply` runs it again, which is harmless once no record holds the old value.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "picklists": {
      "picklistValues": [
        {
          "metadataType": "StandardValueSet",
          "metadataFullName": "LeadSource",
          "value": "Phone Inquiry",
          "newValue": "Other"
        }
      ]
    }
  }
}
```

## Fill the blank values of the records

Acme imported a purchased list of prospects without filling their source, and its marketing reports now show a large "blank" slice. Records are data, not metadata: no deployment can fill an empty field, and only the **Replace** page of the picklist offers to replace the blanks.

With `replaceAllBlankValues`, the leads whose **Lead Source** is empty, like Bongani Dube's, get **Purchased List**. It is an alternative to `value`: one action replaces either a value or the blanks.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "picklists": {
      "picklistValues": [
        {
          "metadataType": "StandardValueSet",
          "metadataFullName": "LeadSource",
          "replaceAllBlankValues": true,
          "newValue": "Purchased List"
        }
      ]
    }
  }
}
```

## Replace a value in the records, then deactivate it

The AUX input of old cars is now part of the media system. The admins of the dealer want every Vehicle that says **AUX** to say **Media**, and AUX to leave the choices, while the records keep a valid value. A deployment can deactivate a value, but it leaves the records with the old one: only the **Replace** page of Setup moves them.

Two actions on the same value run in order: the first replaces it in the records, the second sets **active** to `false`. The list of a config is applied from top to bottom.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "picklists": {
      "picklistValues": [
        {
          "metadataType": "CustomField",
          "metadataFullName": "Vehicle__c.Features__c",
          "value": "AUX",
          "newValue": "Media"
        },
        {
          "metadataType": "CustomField",
          "metadataFullName": "Vehicle__c.Features__c",
          "value": "AUX",
          "active": false
        }
      ]
    }
  }
}
```

## Replace a value in the records, then delete it

Compact discs are gone for good, and the dealer wants the value out of the **Features** field, not only hidden. The Metadata API cannot delete a picklist value: a value missing from a deployment is only deactivated, and its records keep it. Deleting a value in Setup asks what the records that hold it become.

With `absent: true` and a `newValue`, Browserforce deletes **CD** and gives its records **Media**. Without `newValue`, their value is cleared.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "picklists": {
      "picklistValues": [
        {
          "metadataType": "CustomField",
          "metadataFullName": "Vehicle__c.Features__c",
          "value": "CD",
          "newValue": "Media",
          "absent": true
        }
      ]
    }
  }
}
```

## Remove a field dependency

A field dependency also gets in the way: an import of old Vehicle records fails on every gear that does not match its transmission. The dealer removes the dependency during the migration. The Metadata API can create or change a field dependency, but deploying the field without its controlling field does not remove it.

Set the controlling field of **Gears** on **Vehicle** to `null`: Browserforce deletes the dependency, which leaves the field dependencies of **Transmission**, and every value of Gears is available again. A second `apply` finds no dependency and does nothing.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "picklists": {
      "fieldDependencies": [
        {
          "object": "Vehicle__c",
          "dependentField": "Gears__c",
          "controllingField": null
        }
      ]
    }
  }
}
```
