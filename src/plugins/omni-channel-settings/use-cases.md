## A support center counts only the cases agents are working on

The support center of Litware routes cases to its agents with Omni-Channel. With the default tab-based capacity model, a case counts against an agent's capacity as long as its tab is open, so agents who park cases in "Waiting on customer" stop receiving new work while they have nothing to do.

The **status-based capacity model** counts a case only while its status says it is in progress, and frees the capacity as soon as the agent changes the status or the owner. It is a checkbox of the Omni-Channel Settings page with no Metadata API equivalent; turn it on with this config before configuring the capacity of the service channels with `serviceChannels`.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "omniChannelSettings": {
      "enableStatusBasedCapacityModel": true
    }
  }
}
```
