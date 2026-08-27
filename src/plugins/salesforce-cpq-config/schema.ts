import { z } from 'zod';

const str = (title: string) => z.string().meta({ title }).optional();
const bool = (title: string) => z.boolean().meta({ title }).optional();
const num = (title: string) => z.number().meta({ title }).optional();

export const schema = z
  .object({
    documents: z
      .object({
        documentFolder: str('Document Folder'),
        hideDocumentName: bool('Hide Document Name'),
        fullPagePreview: bool('Full Page Preview'),
        excludeHiddenLinesInGroupTotals: bool('Exclude Hidden Lines In Group Totals'),
        attachmentTarget: str('Attachment Target'),
        postToFeed: bool('Post to Feed?'),
        enableMultiLanguageTranslations: bool('Enable Multi-Language Translations'),
      })
      .meta({ title: 'Documents' })
      .optional(),
    groups: z
      .object({
        solutionGroupsEnabled: bool('Solution Groups Enabled'),
        object: str('Object'),
        nameField: str('Name Field'),
        descriptionField: str('Description Field'),
        requireGroupName: bool('Require Group Name'),
      })
      .meta({ title: 'Groups' })
      .optional(),
    lineEditor: z
      .object({
        hideRenewedAssetsWhenEditing: bool('Hide Renewed Assets When Editing'),
        visualizeProductHierarchy: bool('Visualize Product Hierarchy'),
        preserveBundleStructure: bool('Preserve Bundle Structure'),
        keepBundleTogether: bool('Keep Bundle Together'),
        totalsField: str('Totals Field'),
        lineSubtotalsTotalField: str('Line Subtotals Total Field'),
        largeQuoteThreshold: num('Large Quote Threshold'),
        quoteBatchSize: num('Quote Batch Size'),
        enableExpandCollapseBundles: bool('Enable Expand/Collapse Bundles'),
        defaultBundleSetting: str('Default Bundle Setting'),
        actionsColumnPlacement: str('Actions Column Placement'),
        enableMultiLineDelete: bool('Enable Multi Line Delete'),
        productConfigurationInitializer: str('Product Configuration Initializer'),
        enableAssetUpgrades: bool('Enable Asset Upgrades'),
        groupSubtotalsField: str('Group Subtotals Field'),
        wrapButtons: bool('Wrap Buttons'),
        validateLargeQuotes: bool('Validate Large Quotes'),
        enableCompactMode: bool('Enable Compact Mode'),
        enableLargeQuoteExperience: bool('Enable Large Quote Experience'),
        enableColumnResizing: bool('Enable Column Resizing'),
      })
      .meta({ title: 'Line Editor' })
      .optional(),
    plugins: z
      .object({
        legacyPageSecurityPlugin: str('Legacy Page Security Plugin'),
        electronicSignaturePlugin: str('Electronic Signature Plugin'),
        billingPlugin: str('Billing Plugin'),
        productSearchPlugin: str('Product Search Plugin'),
        recommendedProductsPlugin: str('Recommended Products Plugin'),
        legacyQuoteCalculatorPlugin: str('Legacy Quote Calculator Plugin'),
        documentStorePlugin: str('Document Store Plugin'),
        quoteCalculatorPlugin: str('Quote Calculator Plugin'),
        orderManagementPlugin: str('Order Management Plugin'),
        qleCustomActionPlugin: str('QLE Custom Action Plugin'),
      })
      .meta({ title: 'Plugins' })
      .optional(),
    pricingAndCalculation: z
      .object({
        currencySymbol: str('Currency Symbol'),
        useInactivePrices: bool('Use Inactive Prices'),
        unitPriceScale: num('Unit Price Scale'),
        calculateImmediately: bool('Calculate Immediately'),
        enableQuickCalculate: bool('Enable Quick Calculate'),
        allowNonConsecutiveCustomSegments: bool('Allow Non-Consecutive Custom Segments'),
        enablePricingGuidance: bool('Enable Pricing Guidance'),
        quoteLineEditsForUsageBasedPricing: bool('Quote Line Edits for Usage Based Pricing'),
        useLegacyCalculator: bool('Use Legacy Calculator'),
        disableBackgroundCalculationRefresh: bool('Disable Background Calculation Refresh'),
        enableUsageBasedPricing: bool('Enable Usage Based Pricing'),
        hideUncalculatedQuoteWarning: bool('Hide Uncalculated Quote Warning'),
        useIntegrationUserForCalculations: bool('Use Integration User for Calculations'),
      })
      .meta({ title: 'Pricing and Calculation' })
      .optional(),
    subscriptionsAndRenewals: z
      .object({
        renewalModel: str('Renewal Model'),
        disableAddSubscriptions: bool('Disable Add Subscriptions'),
        allowRenewalQuotesWithoutAssets: bool('Allow Renewal Quotes Without Assets'),
        subscriptionProratePrecision: str('Subscription Prorate Precision'),
        includeNetNewProductsInMaintenance: bool('Include Net-new Products in Maintenance'),
        contractInForeground: bool('Contract In Foreground'),
        enableEvergreenSubscriptions: bool('Enable Evergreen Subscriptions'),
        legacyAmendRenewService: bool('Legacy Amend/Renew Service'),
        amendContractsInBackground: bool('Amend Contracts in Background'),
        bypassPreserveBundleStructure: bool('Bypass Preserve Bundle Structure'),
        subscriptionTermUnit: str('Subscription Term Unit'),
        reEvaluateBundleLogicOnRenewals: bool('Re-evaluate Bundle Logic on Renewals'),
        poTRenewalsContractingFromOrders: bool('PoT Renewals (Contracting from Orders)'),
        disableProductBundleSubTypeChecks: bool('Disable Product Bundle Sub Type Checks'),
        useCurrentSubscriptionOnAssets: bool('Use Current Subscription on Assets'),
      })
      .meta({ title: 'Subscriptions and Renewals' })
      .optional(),
    quote: z
      .object({
        disableInitialQuoteSync: bool('Disable Initial Quote Sync'),
        disableQuoteContactDefaulting: bool('Disable Quote Contact Defaulting'),
        allowOptionDeletion: bool('Allow Option Deletion'),
        disableQuoteAddressDefaulting: bool('Disable Quote Address Defaulting'),
        primaryQuoteKeepsOpportunityProducts: bool('Primary Quote Keeps Opportunity Products'),
        defaultQuoteValidityDays: num('Default Quote Validity (Days)'),
      })
      .meta({ title: 'Quote' })
      .optional(),
    order: z
      .object({
        requireApprovedQuote: bool('Require Approved Quote'),
        defaultOrderStartDate: str('Default Order Start Date'),
        allowMultipleOrders: bool('Allow Multiple Orders'),
        createOrdersWithoutOpportunities: bool('Create Orders Without Opportunities'),
      })
      .meta({ title: 'Order' })
      .optional(),
    additionalSettings: z
      .object({
        triggersDisabled: bool('Triggers Disabled'),
        quantityScale: num('Quantity Scale'),
        sortProductsInMemory: bool('Sort Products In Memory'),
        multipleBundlesView: str('Multiple Bundles View'),
        externalConfiguratorUrl: str('External Configurator URL'),
        thirdPartyConfigurator: bool('Third Party Configurator'),
        openSearchFilterByDefault: bool('Open Search Filter By Default'),
        hideFeaturesWithHiddenOptions: bool('Hide Features with Hidden Options'),
        hideProductSearchBar: bool('Hide Product Search Bar'),
        productResultsGroupFieldName: str('Product Results Group Field Name'),
        productDescriptionField: str('Product Description Field'),
        theme: str('Theme'),
        useGlobalHeaderPermission: bool('Use Global Header Permission'),
        serviceRegion: str('Service Region'),
        enableProductOptionDrawer: bool('Enable Product Option Drawer'),
        enableLargeConfigurations: bool('Enable Large Configurations'),
        nestedBundlesForExternalConfigurator: bool('Nested Bundles for External Configurator'),
      })
      .meta({ title: 'Additional Settings' })
      .optional(),
  })
  .meta({ id: 'salesforceCpqConfig', title: 'SalesforceCpqConfig Settings' });
