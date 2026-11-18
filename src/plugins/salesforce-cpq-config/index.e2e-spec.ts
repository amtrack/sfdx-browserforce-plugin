import assert from 'assert';
import { readFileSync } from 'node:fs';
import { BASE_PATH, SalesforceCpqConfig, salesforceCpqConfigSchema, CONFIGURE_SELECTOR } from './index.js';
import { type PageCapture } from '../../../scripts/use-cases.js';
import { formConfig } from './formConfig.js';
import { capture } from '../../../test/capture.js';

/**
 * The capture of a tab of the Salesforce CPQ settings (Installed Packages → Salesforce CPQ → Configure), with a pill on
 * the control of each field, found like the plugin finds it.
 */
function tab(name: string, fields: string[], height = 1400): PageCapture {
  const selector = (field: string): string => {
    const property = formConfig[name].properties[field];
    return `${property.component}[name="${property.name}"]`;
  };
  return {
    height,
    async open(doc) {
      const page = await doc.open(BASE_PATH);
      await doc.click(page, CONFIGURE_SELECTOR);
      await doc.click(page, `td[id="${formConfig[name].id}"]`);
      return page;
    },
    // the header and the tab bar, from Documents to Additional Settings, frame every tab the same way
    context: [
      `td[id="${formConfig.documents.id}"]`,
      `td[id="${formConfig.additionalSettings.id}"]`,
      ':text-is("Settings Editor")',
    ],
    pills: Object.fromEntries(fields.map((field) => [`${name}.${field}`, selector(field)])),
  };
}

const defaultConfig = JSON.parse(readFileSync(new URL('./default.json', import.meta.url), 'utf8'));

const describeOrSkip = process.env['CPQ'] === 'true' ? describe : describe.skip;
describeOrSkip(SalesforceCpqConfig.name, function () {
  let plugin: SalesforceCpqConfig;
  before(() => {
    plugin = new SalesforceCpqConfig(global.browserforce);
  });

  const configDefault: any = defaultConfig.settings.salesforceCpqConfig;
  const configCustom = {
    documents: {
      documentFolder: 'Quotes',
      hideDocumentName: true,
    },
    quote: {
      disableInitialQuoteSync: true,
      defaultQuoteValidityDays: 45,
    },
    additionalSettings: {
      quantityScale: 3,
    },
    // the fields of the object only appear once Solution Groups Enabled is checked
    groups: {
      solutionGroupsEnabled: true,
      object: 'SBQQ__SolutionGroup__c',
      nameField: 'Group Name',
      descriptionField: 'Description',
    },
  };

  it('should apply default config', async () => {
    await plugin.run(configDefault);
  });

  it('should already be configured', async () => {
    const res = await plugin.run(configDefault);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });

  it('should apply custom config', async () => {
    const res = await plugin.run(configCustom);
    assert.notDeepStrictEqual(res, { message: 'no action necessary' });
  });

  it('should already be configured', async () => {
    const res = await plugin.run(configCustom);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
  it(
    'should configure the documents and the validity of quotes @capture',
    capture(salesforceCpqConfigSchema, {
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
      pages: {
        documents: {
          ...tab('documents', [
            'documentFolder',
            'hideDocumentName',
            'fullPagePreview',
            'excludeHiddenLinesInGroupTotals',
            'attachmentTarget',
            'postToFeed',
            'enableMultiLanguageTranslations',
          ]),
          title: 'Documents',
        },
        quote: {
          ...tab('quote', [
            'disableInitialQuoteSync',
            'disableQuoteContactDefaulting',
            'allowOptionDeletion',
            'disableQuoteAddressDefaulting',
            'primaryQuoteKeepsOpportunityProducts',
            'defaultQuoteValidityDays',
          ]),
          title: 'Quote',
        },
      },
    }),
  );
  it(
    'should configure the quote line editor for large quotes @capture',
    capture(salesforceCpqConfigSchema, {
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
      pages: {
        'line-editor': {
          ...tab('lineEditor', [
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
          ]),
          title: 'Line Editor',
        },
      },
    }),
  );
  it(
    'should configure pricing and calculation @capture',
    capture(salesforceCpqConfigSchema, {
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
      pages: {
        'pricing-and-calculation': {
          ...tab('pricingAndCalculation', [
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
          ]),
          title: 'Pricing and Calculation',
        },
        plugins: {
          ...tab('plugins', [
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
          ]),
          title: 'Plugins',
        },
      },
    }),
  );
  it(
    'should configure subscriptions, renewals and orders @capture',
    capture(salesforceCpqConfigSchema, {
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
      pages: {
        'subscriptions-and-renewals': {
          ...tab('subscriptionsAndRenewals', [
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
          ]),
          title: 'Subscriptions and Renewals',
        },
        order: {
          ...tab('order', [
            'requireApprovedQuote',
            'defaultOrderStartDate',
            'allowMultipleOrders',
            'createOrdersWithoutOpportunities',
          ]),
          title: 'Order',
        },
      },
    }),
  );
  it(
    'should configure solution groups and product selection @capture',
    capture(salesforceCpqConfigSchema, {
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
      pages: {
        groups: {
          ...tab('groups', ['requireGroupName']),
          title: 'Groups',
        },
        'additional-settings': {
          ...tab('additionalSettings', [
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
          ]),
          title: 'Additional Settings',
        },
      },
    }),
  );
  it('should configure the solution group object', async () => {
    await plugin.run({ groups: { solutionGroupsEnabled: false } });
    await plugin.run({
      groups: {
        solutionGroupsEnabled: true,
        object: 'SBQQ__SolutionGroup__c',
        nameField: 'Group Name',
        descriptionField: 'Description',
      },
    });
  });
});
