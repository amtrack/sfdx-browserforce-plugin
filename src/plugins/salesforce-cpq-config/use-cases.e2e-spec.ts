import { defineUseCases, type UseCaseDoc } from '../../../scripts/use-cases.js';
import { formConfig } from './formConfig.js';
import { salesforceCpqConfigSchema, CONFIGURE_SELECTOR } from './index.js';

/** A field of a tab of the settings, or a field whose control is only in the "Before" or the "After" image. */
type TabField = string | { field: string; in: 'before' | 'after' };

/**
 * Opens a tab of the Salesforce CPQ settings (Installed Packages → Salesforce CPQ → Configure) and shoots it as the
 * capture named after the tab, with a pill on the control of each field, found like the plugin finds it.
 */
async function shootTab(
  doc: UseCaseDoc,
  tab: string,
  fields: TabField[],
  { height = 1400 }: { height?: number } = {},
): Promise<void> {
  await using page = await doc.open('/0A3?setupid=ImportedPackage', { height });
  await doc.click(page, CONFIGURE_SELECTOR);
  await doc.click(page, `td[id="${formConfig[tab].id}"]`);
  const ui = await doc.within(page, '[id="page:form:pb"]');
  const control = (field: string) => {
    const property = formConfig[tab].properties[field];
    return ui.locator(`${property.component}[name="${property.name}"]`);
  };
  await doc.shot(
    tab.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
    page,
    {
      context: [ui.locator('[id="page:form:pb"]')],
      pills: Object.fromEntries(
        fields.map((entry) =>
          typeof entry === 'string'
            ? [`${tab}.${entry}`, control(entry)]
            : [`${tab}.${entry.field}`, { locator: control(entry.field), in: entry.in }],
        ),
      ),
    },
  );
}

export const useCases = defineUseCases(salesforceCpqConfigSchema, [
  {
    slug: '01-quote-documents-and-validity',
    title: 'Generate the quote documents on the opportunity',
    given: {
      documents: {
        documentFolder: 'User Personal Documents',
        fullPagePreview: false,
        attachmentTarget: 'Document Only',
        postToFeed: false,
      },
      quote: { primaryQuoteKeepsOpportunityProducts: false },
    },
    config: {
      documents: {
        documentFolder: 'Quotes',
        hideDocumentName: false,
        fullPagePreview: true,
        excludeHiddenLinesInGroupTotals: false,
        attachmentTarget: 'Opportunity',
        postToFeed: true,
        enableMultiLanguageTranslations: false,
      },
      quote: {
        disableInitialQuoteSync: false,
        disableQuoteContactDefaulting: false,
        allowOptionDeletion: false,
        disableQuoteAddressDefaulting: false,
        primaryQuoteKeepsOpportunityProducts: true,
        defaultQuoteValidityDays: 30,
      },
    },
    story: [
      "Acme's sales reps send their quotes as PDF documents, and the sales managers want to find them on the opportunity, announced in its feed. Those choices are settings of the Salesforce CPQ package, stored in its protected custom settings: no Metadata API deployment can write them, only the settings page of the package can.",
      'On the **Documents** tab, the generated documents go to the **Quotes (1)** folder, open in a **full page preview (3)**, are attached to the **Opportunity (5)** and **posted to its feed (6)**. On the **Quote** tab, the primary quote keeps the **opportunity products (12)**, and a new quote stays valid **30 days (13)**. Each pill marks a field of the config, changed or not, so the config can describe the whole tab.',
    ],
    captures: {
      documents: {
        title: 'Documents',
        // from the Settings Editor header to just below the last pill, the same top on every tab
        clip: { x: 240, y: 130, width: 1180, height: 339 },
      },
      quote: {
        title: 'Quote',
        // from the Settings Editor header to just below the last pill, the same top on every tab
        clip: { x: 240, y: 130, width: 1180, height: 300 },
      },
    },
    async shoot(doc) {
      await shootTab(doc, 'documents', [
        'documentFolder',
        'hideDocumentName',
        'fullPagePreview',
        'excludeHiddenLinesInGroupTotals',
        'attachmentTarget',
        'postToFeed',
        'enableMultiLanguageTranslations',
      ]);
      await shootTab(doc, 'quote', [
        'disableInitialQuoteSync',
        'disableQuoteContactDefaulting',
        'allowOptionDeletion',
        'disableQuoteAddressDefaulting',
        'primaryQuoteKeepsOpportunityProducts',
        'defaultQuoteValidityDays',
      ]);
    },
  },
  {
    slug: '02-quote-line-editor-for-large-quotes',
    title: 'Tune the quote line editor for large quotes',
    given: {
      lineEditor: {
        visualizeProductHierarchy: false,
        totalsField: 'Default',
        // other numbers than the config, so "Before" shows them change whatever an earlier run left
        largeQuoteThreshold: 100,
        quoteBatchSize: 20,
        validateLargeQuotes: false,
        actionsColumnPlacement: 'Right',
        enableMultiLineDelete: false,
        enableLargeQuoteExperience: false,
        enableColumnResizing: false,
        enableExpandCollapseBundles: false,
      },
    },
    config: {
      lineEditor: {
        hideRenewedAssetsWhenEditing: false,
        visualizeProductHierarchy: true,
        preserveBundleStructure: true,
        keepBundleTogether: true,
        totalsField: 'Net Amount',
        lineSubtotalsTotalField: 'Default',
        largeQuoteThreshold: 300,
        quoteBatchSize: 50,
        actionsColumnPlacement: 'Left',
        enableMultiLineDelete: true,
        productConfigurationInitializer: '',
        enableAssetUpgrades: false,
        groupSubtotalsField: 'Default',
        wrapButtons: false,
        validateLargeQuotes: true,
        enableCompactMode: true,
        enableLargeQuoteExperience: true,
        enableColumnResizing: true,
        enableExpandCollapseBundles: true,
        defaultBundleSetting: 'Collapsed',
      },
    },
    story: [
      'Acme sells data center equipment: a quote holds hundreds of lines, grouped in bundles, and the quote line editor of Salesforce CPQ became slow and hard to read. Its settings belong to the protected custom settings of the package, which no Metadata API deployment can write: they are only set on the settings page of the package.',
      'This config turns on the **large quote experience (17)**, shows the **product hierarchy (2)** with **collapsed (20)** bundles that users can **expand and collapse (19)**, puts the actions on the **left (9)**, allows deleting **several lines at once (10)** and **resizing columns (18)**, and shows the **Net Amount (5)** as the total. The large quote threshold **(7)** and the batch size **(8)** are numbers. Every field of the tab carries a pill, changed or not.',
    ],
    captures: {
      'line-editor': {
        title: 'Line Editor',
        // from the Settings Editor header to just below the last pill, the same top on every tab
        clip: { x: 240, y: 130, width: 1180, height: 570 },
      },
    },
    async shoot(doc) {
      await shootTab(doc, 'lineEditor', [
        'hideRenewedAssetsWhenEditing',
        'visualizeProductHierarchy',
        'preserveBundleStructure',
        'keepBundleTogether',
        'totalsField',
        'lineSubtotalsTotalField',
        'largeQuoteThreshold',
        'quoteBatchSize',
        'actionsColumnPlacement',
        'enableMultiLineDelete',
        'productConfigurationInitializer',
        'enableAssetUpgrades',
        'groupSubtotalsField',
        'wrapButtons',
        'validateLargeQuotes',
        'enableCompactMode',
        'enableLargeQuoteExperience',
        'enableColumnResizing',
        'enableExpandCollapseBundles',
        'defaultBundleSetting',
      ]);
    },
  },
  {
    slug: '03-pricing-and-calculation',
    title: 'Calculate prices faster',
    given: { pricingAndCalculation: { enableQuickCalculate: false, hideUncalculatedQuoteWarning: false } },
    config: {
      pricingAndCalculation: {
        currencySymbol: '',
        unitPriceScale: 2,
        enableQuickCalculate: true,
        allowNonConsecutiveCustomSegments: false,
        enablePricingGuidance: false,
        useLegacyCalculator: false,
        useInactivePrices: false,
        calculateImmediately: false,
        disableBackgroundCalculationRefresh: false,
        enableUsageBasedPricing: false,
        quoteLineEditsForUsageBasedPricing: false,
        hideUncalculatedQuoteWarning: true,
        useIntegrationUserForCalculations: true,
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
        qleCustomActionPlugin: '',
      },
    },
    story: [
      'The sales reps of Acme wait for the price calculation of every quote, and its "not calculated" warning confuses them while the background calculation runs. The pricing settings of Salesforce CPQ are protected custom settings of the package: no Metadata API deployment can write them, only its settings page can.',
      'On the **Pricing and Calculation** tab, this config turns on the **quick calculate (3)** button and hides the **uncalculated quote warning (12)**, keeping the calculation with the **integration user (13)**. On the **Plugins** tab, the plugin fields **(14)** to **(23)** take the names of Apex classes or JavaScript plugins; empty values keep the standard behavior. Every field of both tabs carries a pill.',
    ],
    captures: {
      'pricing-and-calculation': {
        title: 'Pricing and Calculation',
        // from the Settings Editor header to just below the last pill, the same top on every tab
        clip: { x: 240, y: 130, width: 1180, height: 483 },
      },
      plugins: {
        title: 'Plugins',
        // from the Settings Editor header to just below the last pill, the same top on every tab
        clip: { x: 240, y: 130, width: 1180, height: 381 },
      },
    },
    async shoot(doc) {
      await shootTab(doc, 'pricingAndCalculation', [
        'currencySymbol',
        'unitPriceScale',
        'enableQuickCalculate',
        'allowNonConsecutiveCustomSegments',
        'enablePricingGuidance',
        'useLegacyCalculator',
        'useInactivePrices',
        'calculateImmediately',
        'disableBackgroundCalculationRefresh',
        'enableUsageBasedPricing',
        'quoteLineEditsForUsageBasedPricing',
        'hideUncalculatedQuoteWarning',
        'useIntegrationUserForCalculations',
      ]);
      await shootTab(doc, 'plugins', [
        'legacyPageSecurityPlugin',
        'electronicSignaturePlugin',
        'billingPlugin',
        'productSearchPlugin',
        'recommendedProductsPlugin',
        'legacyQuoteCalculatorPlugin',
        'documentStorePlugin',
        'quoteCalculatorPlugin',
        'orderManagementPlugin',
        'qleCustomActionPlugin',
      ]);
    },
  },
  {
    slug: '04-subscriptions-renewals-and-orders',
    title: 'Run subscriptions, renewals and orders the way the business does',
    given: {
      subscriptionsAndRenewals: {
        subscriptionProratePrecision: 'Monthly + Daily',
        enableEvergreenSubscriptions: false,
        amendContractsInBackground: false,
      },
      order: { requireApprovedQuote: false, defaultOrderStartDate: '-- None --', allowMultipleOrders: false },
    },
    config: {
      subscriptionsAndRenewals: {
        renewalModel: 'Contract Based',
        disableAddSubscriptions: false,
        allowRenewalQuotesWithoutAssets: false,
        subscriptionTermUnit: 'Month',
        subscriptionProratePrecision: 'Day',
        includeNetNewProductsInMaintenance: false,
        contractInForeground: false,
        reEvaluateBundleLogicOnRenewals: false,
        enableEvergreenSubscriptions: true,
        poTRenewalsContractingFromOrders: true,
        legacyAmendRenewService: false,
        amendContractsInBackground: true,
        disableProductBundleSubTypeChecks: false,
        bypassPreserveBundleStructure: false,
        useCurrentSubscriptionOnAssets: false,
      },
      order: {
        requireApprovedQuote: true,
        defaultOrderStartDate: 'Quote Start Date',
        allowMultipleOrders: true,
        createOrdersWithoutOpportunities: false,
      },
    },
    story: [
      'Acme sells software subscriptions that renew until the customer cancels, bills them to the day, and only ships orders from approved quotes. Those rules are settings of Salesforce CPQ, kept in protected custom settings of the package that no Metadata API deployment can write: they are set on the settings page of the package.',
      'On **Subscriptions and Renewals**, this config prorates to the **day (5)**, enables **evergreen subscriptions (9)** and **amends contracts in the background (12)**. On **Order**, an order needs an **approved quote (16)**, starts on the **quote start date (17)** and a quote can be split into **several orders (18)**. Every field of both tabs carries a pill.',
    ],
    captures: {
      'subscriptions-and-renewals': {
        title: 'Subscriptions and Renewals',
        // from the Settings Editor header to just below the last pill, the same top on every tab
        clip: { x: 240, y: 130, width: 1180, height: 585 },
      },
      order: {
        title: 'Order',
        // from the Settings Editor header to just below the last pill, the same top on every tab
        clip: { x: 240, y: 130, width: 1180, height: 313 },
      },
    },
    async shoot(doc) {
      await shootTab(doc, 'subscriptionsAndRenewals', [
        'renewalModel',
        'disableAddSubscriptions',
        'allowRenewalQuotesWithoutAssets',
        'subscriptionTermUnit',
        'subscriptionProratePrecision',
        'includeNetNewProductsInMaintenance',
        'contractInForeground',
        'reEvaluateBundleLogicOnRenewals',
        'enableEvergreenSubscriptions',
        'poTRenewalsContractingFromOrders',
        'legacyAmendRenewService',
        'amendContractsInBackground',
        'disableProductBundleSubTypeChecks',
        'bypassPreserveBundleStructure',
        'useCurrentSubscriptionOnAssets',
      ]);
      await shootTab(doc, 'order', [
        'requireApprovedQuote',
        'defaultOrderStartDate',
        'allowMultipleOrders',
        'createOrdersWithoutOpportunities',
      ]);
    },
  },
  {
    slug: '05-solution-groups-and-product-selection',
    title: 'Group quote lines by solution and tune the product selection',
    given: {
      groups: { requireGroupName: false },
      additionalSettings: {
        multipleBundlesView: 'Wizard',
        openSearchFilterByDefault: false,
        productResultsGroupFieldName: '-- None --',
      },
    },
    config: {
      groups: { requireGroupName: true },
      additionalSettings: {
        triggersDisabled: false,
        quantityScale: 2,
        sortProductsInMemory: false,
        multipleBundlesView: 'Classic',
        externalConfiguratorUrl: '',
        thirdPartyConfigurator: false,
        openSearchFilterByDefault: true,
        hideFeaturesWithHiddenOptions: false,
        hideProductSearchBar: false,
        productResultsGroupFieldName: 'Product Family',
        productDescriptionField: 'Product Description',
        theme: '-- None --',
        useGlobalHeaderPermission: false,
        serviceRegion: 'Default',
        enableProductOptionDrawer: false,
        enableLargeConfigurations: false,
        nestedBundlesForExternalConfigurator: false,
      },
    },
    story: [
      'A car dealer quotes several vehicles in one deal, and wants the quote lines grouped by vehicle, each group named. Its sales reps also browse a long product catalog and need the search filters open and the results grouped by product family. These are settings of Salesforce CPQ, protected custom settings of the package that no Metadata API deployment can write: only the settings page of the package sets them.',
      'On **Groups**, this config requires a **group name (1)** for each group of quote lines. On **Additional Settings**, bundles open in the **Classic (5)** view, the search filter is **open (8)** and the results are grouped by **Product Family (11)**. Every field of both tabs carries a pill.',
    ],
    captures: {
      groups: {
        title: 'Groups',
        // from the Settings Editor header to just below the last pill, the same top on every tab
        clip: { x: 240, y: 130, width: 1180, height: 300 },
      },
      'additional-settings': {
        title: 'Additional Settings',
        // from the Settings Editor header to just below the last pill, the same top on every tab
        clip: { x: 240, y: 130, width: 1180, height: 536 },
      },
    },
    async shoot(doc) {
      await shootTab(doc, 'groups', ['requireGroupName']);
      await shootTab(doc, 'additionalSettings', [
        'triggersDisabled',
        'quantityScale',
        'sortProductsInMemory',
        'multipleBundlesView',
        'externalConfiguratorUrl',
        'thirdPartyConfigurator',
        'openSearchFilterByDefault',
        'hideFeaturesWithHiddenOptions',
        'hideProductSearchBar',
        'productResultsGroupFieldName',
        'productDescriptionField',
        'theme',
        'useGlobalHeaderPermission',
        'serviceRegion',
        'enableProductOptionDrawer',
        'enableLargeConfigurations',
        'nestedBundlesForExternalConfigurator',
      ]);
    },
  },
  {
    slug: '06-solution-group-object',
    title: 'Turn on solution groups and choose their fields',
    given: { groups: { solutionGroupsEnabled: false } },
    config: {
      groups: {
        solutionGroupsEnabled: true,
        object: 'SBQQ__SolutionGroup__c',
        nameField: 'Group Name',
        descriptionField: 'Description',
      },
    },
    story: [
      'Contoso sells installation projects in which a quote holds several solutions: the hardware of a site, its cabling, its support contract. Sales reps want the quote line editor to group the lines of each solution.',
      'Ticking **Solution Groups Enabled (1)** makes Salesforce CPQ ask where the groups live: the **Object (2)** that stores them, here the `SBQQ__SolutionGroup__c` object of the package, and which of its fields gives the **name (3)** and the **description (4)** of a group. CPQ refuses to save the first without the three others. These are protected custom settings of the managed package: no Metadata API deployment can write them.',
    ],
    captures: {
      groups: {
        title: 'Groups',
        // from the Settings Editor header to just below the last pill, the same top on every tab
        clip: { x: 240, y: 130, width: 1180, height: 330 },
      },
    },
    async shoot(doc) {
      await shootTab(
        doc,
        'groups',
        [
          'solutionGroupsEnabled',
          { field: 'object', in: 'after' },
          { field: 'nameField', in: 'after' },
          { field: 'descriptionField', in: 'after' },
        ],
        { height: 1000 },
      );
    },
  },
]);
