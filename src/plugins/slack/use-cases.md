## The sales team works its deals from Slack

The account executives of Trey Research spend their day in Slack, and update their opportunities in Salesforce at the end of the week, if at all. Sales operations wants them to look up and update records, and get deal alerts, without leaving Slack, with the Sales Cloud for Slack app.

Before any Slack app can connect to the org, an admin must **accept the terms and conditions** of the Slack integration, then turn on **Sales Cloud for Slack**. No Metadata API type holds either toggle, and the terms can never be declined again once accepted: this config does both in each new org, so the Slack workspace of the sandbox can be connected right after it is created.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "slack": {
      "agreeToTermsAndConditions": true,
      "enableSalesCloudForSlack": true
    }
  }
}
```
