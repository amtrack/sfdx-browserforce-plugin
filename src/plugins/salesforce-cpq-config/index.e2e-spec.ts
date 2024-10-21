import assert from 'assert';
import { SalesforceCpqConfig } from '.';
import defaultConfig from './default.json';

describe(SalesforceCpqConfig.name, function () {
  let plugin: SalesforceCpqConfig;
  before(() => {
    plugin = new SalesforceCpqConfig(global.bf);
  });

  const configDefault: any = defaultConfig.settings.salesforceCpqConfig;
  it('should run', async () => {
    await plugin.run(configDefault);
  });

  it('should retrieve', async () => {
    const res = await plugin.retrieve(configDefault);
    assert.deepStrictEqual(res, {
      documents: {
        documentFolder: 'User Personal Documents',
        hideDocumentName: false,
        fullPagePreview: false,
        excludeHiddenLinesInGroupTotals: false,
        attachmentTarget: 'Document Only',
        postToFeed: false,
        enableMultiLanguageTranslations: false
      },
      groups: { requireGroupName: true },
      lineEditor: {
        hideRenewedAssetsWhenEditing: false,
        visualizeProductHierarchy: false,
        preserveBundleStructure: true,
        keepBundleTogether: true,
        totalsField: 'Default',
        lineSubtotalsTotalField: 'Default',
        defaultBundleSetting: 'Expanded',
        actionsColumnPlacement: 'Right',
        enableMultiLineDelete: false,
        productConfigurationInitializer: '',
        enableAssetUpgrades: false,
        groupSubtotalsField: 'Default',
        wrapButtons: false,
        validateLargeQuotes: false,
        enableCompactMode: true,
        enableLargeQuoteExperience: false,
        enableColumnResizing: false
      },
      plugins: {
        legacyPageSecurityPlugin: '',
        electronicSignaturePlugin: '',
        billingPlugin: '',
        productSearchPlugin: '',
        recommendedProductsPlugin: '',
        legacyQuoteCalculatorPlugin: '',
        documentStorePlugin: '',
        quoteCalculatorPlugin: '',
        orderManagementPlugin: '',
        qleCustomActionPlugin: ''
      },
      pricingAndCalculation: {
        currencySymbol: '',
        enableQuickCalculate: false,
        allowNonConsecutiveCustomSegments: false,
        enablePricingGuidance: false,
        useInactivePrices: false,
        calculateImmediately: false,
        disableBackgroundCalculationRefresh: false,
        enableUsageBasedPricing: false,
        quoteLineEditsForUsageBasedPricing: false,
        hideUncalculatedQuoteWarning: false,
        useIntegrationUserForCalculations: true
      },
      subscriptionsAndRenewals: {
        renewalModel: 'Contract Based',
        disableAddSubscriptions: false,
        allowRenewalQuotesWithoutAssets: false,
        subscriptionTermUnit: 'Month',
        subscriptionProratePrecision: 'Monthly + Daily',
        includeNetNewProductsInMaintenance: false,
        contractInForeground: false,
        enableEvergreenSubscriptions: false,
        poTRenewalsContractingFromOrders: true,
        amendContractsInBackground: false,
        disableProductBundleSubTypeChecks: false,
        bypassPreserveBundleStructure: false,
        useCurrentSubscriptionOnAssets: false
      },
      quote: {
        disableInitialQuoteSync: false,
        disableQuoteContactDefaulting: false,
        allowOptionDeletion: false,
        disableQuoteAddressDefaulting: false,
        primaryQuoteKeepsOpportunityProducts: false
      },
      order: {
        requireApprovedQuote: false,
        defaultOrderStartDate: '-- None --',
        allowMultipleOrders: false,
        createOrdersWithoutOpportunities: false
      },
      additionalSettings: {
        triggersDisabled: false,
        sortProductsInMemory: false,
        multipleBundlesView: 'Wizard',
        externalConfiguratorUrl: '',
        thirdPartyConfigurator: false,
        openSearchFilterByDefault: false,
        hideFeaturesWithHiddenOptions: false,
        hideProductSearchBar: false,
        productResultsGroupFieldName: '-- None --',
        productDescriptionField: 'Product Description',
        theme: '-- None --',
        useGlobalHeaderPermission: false,
        serviceRegion: 'Default',
        enableProductOptionDrawer: false,
        enableLargeConfigurations: false,
        nestedBundlesForExternalConfigurator: false
      }
    });
  });
});
