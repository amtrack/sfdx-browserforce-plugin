## Generate the quote documents on the opportunity

Acme's sales reps send their quotes as PDF documents, and the sales managers want to find them on the opportunity, announced in its feed. Those choices are settings of the Salesforce CPQ package, stored in its protected custom settings: no Metadata API deployment can write them, only the settings page of the package can.

On the **Documents** tab, the generated documents go to the **Quotes** folder, open in a **full page preview**, are attached to the **Opportunity** and **posted to its feed**. On the **Quote** tab, the primary quote keeps the **opportunity products**, and a new quote stays valid **30 days**. Each pill marks a field of the config, changed or not, so the config can describe the whole tab.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "salesforceCpqConfig": {
      "documents": {
        "documentFolder": "Quotes",
        "hideDocumentName": false,
        "fullPagePreview": true,
        "excludeHiddenLinesInGroupTotals": false,
        "attachmentTarget": "Opportunity",
        "postToFeed": true,
        "enableMultiLanguageTranslations": false
      },
      "quote": {
        "disableInitialQuoteSync": false,
        "disableQuoteContactDefaulting": false,
        "allowOptionDeletion": false,
        "disableQuoteAddressDefaulting": false,
        "primaryQuoteKeepsOpportunityProducts": true,
        "defaultQuoteValidityDays": 30
      }
    }
  }
}
```

## Tune the quote line editor for large quotes

Acme sells data center equipment: a quote holds hundreds of lines, grouped in bundles, and the quote line editor of Salesforce CPQ became slow and hard to read. Its settings belong to the protected custom settings of the package, which no Metadata API deployment can write: they are only set on the settings page of the package.

This config turns on the **large quote experience**, shows the **product hierarchy** with **collapsed** bundles that users can **expand and collapse**, puts the actions on the **left**, allows deleting **several lines at once** and **resizing columns**, and shows the **Net Amount** as the total. The large quote threshold and the batch size are numbers. Every field of the tab carries a pill, changed or not.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "salesforceCpqConfig": {
      "lineEditor": {
        "hideRenewedAssetsWhenEditing": false,
        "visualizeProductHierarchy": true,
        "preserveBundleStructure": true,
        "keepBundleTogether": true,
        "totalsField": "Net Amount",
        "lineSubtotalsTotalField": "Default",
        "largeQuoteThreshold": 300,
        "quoteBatchSize": 50,
        "actionsColumnPlacement": "Left",
        "enableMultiLineDelete": true,
        "productConfigurationInitializer": "",
        "enableAssetUpgrades": false,
        "groupSubtotalsField": "Default",
        "wrapButtons": false,
        "validateLargeQuotes": true,
        "enableCompactMode": true,
        "enableLargeQuoteExperience": true,
        "enableColumnResizing": true,
        "enableExpandCollapseBundles": true,
        "defaultBundleSetting": "Collapsed"
      }
    }
  }
}
```

## Calculate prices faster

The sales reps of Acme wait for the price calculation of every quote, and its "not calculated" warning confuses them while the background calculation runs. The pricing settings of Salesforce CPQ are protected custom settings of the package: no Metadata API deployment can write them, only its settings page can.

On the **Pricing and Calculation** tab, this config turns on the **quick calculate** button and hides the **uncalculated quote warning**, keeping the calculation with the **integration user**. On the **Plugins** tab, the plugin fields to take the names of Apex classes or JavaScript plugins; empty values keep the standard behavior. Every field of both tabs carries a pill.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "salesforceCpqConfig": {
      "pricingAndCalculation": {
        "currencySymbol": "",
        "unitPriceScale": 2,
        "enableQuickCalculate": true,
        "allowNonConsecutiveCustomSegments": false,
        "enablePricingGuidance": false,
        "useLegacyCalculator": false,
        "useInactivePrices": false,
        "calculateImmediately": false,
        "disableBackgroundCalculationRefresh": false,
        "enableUsageBasedPricing": false,
        "quoteLineEditsForUsageBasedPricing": false,
        "hideUncalculatedQuoteWarning": true,
        "useIntegrationUserForCalculations": true
      },
      "plugins": {
        "legacyPageSecurityPlugin": "",
        "electronicSignaturePlugin": "",
        "billingPlugin": "",
        "productSearchPlugin": "",
        "recommendedProductsPlugin": "",
        "legacyQuoteCalculatorPlugin": "",
        "documentStorePlugin": "",
        "quoteCalculatorPlugin": "",
        "orderManagementPlugin": "",
        "qleCustomActionPlugin": ""
      }
    }
  }
}
```

## Run subscriptions, renewals and orders the way the business does

Acme sells software subscriptions that renew until the customer cancels, bills them to the day, and only ships orders from approved quotes. Those rules are settings of Salesforce CPQ, kept in protected custom settings of the package that no Metadata API deployment can write: they are set on the settings page of the package.

On **Subscriptions and Renewals**, this config prorates to the **day**, enables **evergreen subscriptions** and **amends contracts in the background**. On **Order**, an order needs an **approved quote**, starts on the **quote start date** and a quote can be split into **several orders**. Every field of both tabs carries a pill.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "salesforceCpqConfig": {
      "subscriptionsAndRenewals": {
        "renewalModel": "Contract Based",
        "disableAddSubscriptions": false,
        "allowRenewalQuotesWithoutAssets": false,
        "subscriptionTermUnit": "Month",
        "subscriptionProratePrecision": "Day",
        "includeNetNewProductsInMaintenance": false,
        "contractInForeground": false,
        "reEvaluateBundleLogicOnRenewals": false,
        "enableEvergreenSubscriptions": true,
        "poTRenewalsContractingFromOrders": true,
        "legacyAmendRenewService": false,
        "amendContractsInBackground": true,
        "disableProductBundleSubTypeChecks": false,
        "bypassPreserveBundleStructure": false,
        "useCurrentSubscriptionOnAssets": false
      },
      "order": {
        "requireApprovedQuote": true,
        "defaultOrderStartDate": "Quote Start Date",
        "allowMultipleOrders": true,
        "createOrdersWithoutOpportunities": false
      }
    }
  }
}
```

## Group quote lines by solution and tune the product selection

A car dealer quotes several vehicles in one deal, and wants the quote lines grouped by vehicle, each group named. Its sales reps also browse a long product catalog and need the search filters open and the results grouped by product family. These are settings of Salesforce CPQ, protected custom settings of the package that no Metadata API deployment can write: only the settings page of the package sets them.

On **Groups**, this config requires a **group name** for each group of quote lines. On **Additional Settings**, bundles open in the **Classic** view, the search filter is **open** and the results are grouped by **Product Family**. Every field of both tabs carries a pill.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "salesforceCpqConfig": {
      "groups": {
        "requireGroupName": true
      },
      "additionalSettings": {
        "triggersDisabled": false,
        "quantityScale": 2,
        "sortProductsInMemory": false,
        "multipleBundlesView": "Classic",
        "externalConfiguratorUrl": "",
        "thirdPartyConfigurator": false,
        "openSearchFilterByDefault": true,
        "hideFeaturesWithHiddenOptions": false,
        "hideProductSearchBar": false,
        "productResultsGroupFieldName": "Product Family",
        "productDescriptionField": "Product Description",
        "theme": "-- None --",
        "useGlobalHeaderPermission": false,
        "serviceRegion": "Default",
        "enableProductOptionDrawer": false,
        "enableLargeConfigurations": false,
        "nestedBundlesForExternalConfigurator": false
      }
    }
  }
}
```

## Turn on solution groups and choose their fields

Contoso sells installation projects in which a quote holds several solutions: the hardware of a site, its cabling, its support contract. Sales reps want the quote line editor to group the lines of each solution.

Ticking **Solution Groups Enabled** makes Salesforce CPQ ask where the groups live: the **Object** that stores them, here the `SBQQ__SolutionGroup__c` object of the package, and which of its fields gives the **name** and the **description** of a group. CPQ refuses to save the first without the three others. These are protected custom settings of the managed package: no Metadata API deployment can write them.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "salesforceCpqConfig": {
      "groups": {
        "solutionGroupsEnabled": true,
        "object": "SBQQ__SolutionGroup__c",
        "nameField": "Group Name",
        "descriptionField": "Description"
      }
    }
  }
}
```
