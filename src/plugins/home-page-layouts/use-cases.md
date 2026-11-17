## Give sales users their own home page

The sales reps of Acme still work in Salesforce Classic, and their home tab should show the dashboard snapshot and the custom links of the **DE Default** home page layout. The Metadata API deploys the `HomePageLayout` itself, but the `Profile` type has no field for its home page layout: which profile sees which layout is only set on the Home Page Layout Assignment page of Setup.

This config gives the **Standard User** profile the **DE Default** layout, and keeps the **System Administrator** profile on the standard home page: an empty `layout` stands for **Home Page Default**. Profiles are named as Setup shows them, and the profiles the config does not list keep their layout.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "homePageLayouts": {
      "homePageLayoutAssignments": [
        {
          "profile": "Standard User",
          "layout": "DE Default"
        },
        {
          "profile": "System Administrator",
          "layout": ""
        }
      ]
    }
  }
}
```
