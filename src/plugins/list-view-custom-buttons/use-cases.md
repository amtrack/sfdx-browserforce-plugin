## Show the custom buttons of the task list views

The support team of Acme works its tasks from list views, and its developers wrote two list buttons, **Test List Button** and **Test List Button 2**, that act on the selected tasks. The `listViewButtons` of the Metadata API (`searchLayouts` of an object) do not apply to tasks and events, so an admin had to add the buttons by hand, in each org.

This config selects both buttons on the list views of **Task**, whose layout is the **Activities List View**, shared with events. The buttons are named by their API name, with their namespace prefix when they come from a package (`th_dev__AssignTask`). With `removeOtherButtons`, the **Selected Buttons** end up exactly as listed.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "listViewCustomButtons": [
      {
        "objectApiName": "Task",
        "buttons": [
          "TestListButton",
          "TestListButton2"
        ],
        "removeOtherButtons": true
      }
    ]
  }
}
```
