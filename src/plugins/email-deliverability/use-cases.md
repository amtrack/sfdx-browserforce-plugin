## The QA team tests the email alerts of a new process

Wide World Importers adds approval and escalation emails to its case management process. Each release is tested in a fresh sandbox, and a new sandbox only sends system emails such as password resets: the email alerts of the process never reach the testers, who report them as bugs.

The Metadata API cannot set the **Access level** of email deliverability: `EmailAdministrationSettings` has no field for it. Applying this config right after the sandbox is created lets the flows and workflow rules send their emails to the test users. Use `System email only` in the opposite situation, for an org loaded with real customer data that must never email them.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "emailDeliverability": {
      "accessLevel": "All email"
    }
  }
}
```
