## A South African subsidiary invoices in rand

Acme opens a sales office in Johannesburg with its own Salesforce org. The org was created with the defaults of the US admin who signed it up, so every opportunity, quote and report shows amounts in US dollars.

The currency of an org without multiple currencies is its **Currency Locale**, a field of the Company Information page that no Metadata API type holds. Applying this config in every new environment of the subsidiary, from the scratch orgs of the developers to production, switches it to `English (South Africa) - ZAR` without anyone clicking in Setup.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "companyInformation": {
      "defaultCurrencyIsoCode": "English (South Africa) - ZAR"
    }
  }
}
```
