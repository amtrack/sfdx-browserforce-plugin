import { z } from 'zod';
import { BrowserforcePlugin } from '../../plugin.js';
import { formConfig } from './formConfig.js';

const str = (title: string) => z.string().meta({ title }).optional();
const bool = (title: string) => z.boolean().meta({ title }).optional();
const num = (title: string) => z.number().meta({ title }).optional();

export const salesforceCpqConfigSchema = z
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

const BASE_PATH = '/0A3?setupid=ImportedPackage&retURL=%2Fui%2Fsetup%2FSetup%3Fsetupid%3DStudio';
const AUTH_PATH = '/setup/secur/RemoteAccessAuthorizationPage.apexp';

const CONFIGURE_SELECTOR = '.actionLink[title*="Configure"][title*="Salesforce CPQ"]';
const GENERATE_INTEGRATION_USER_PERMISSIONS_SELECTOR =
  'input[name="page:form:pb:j_id185:j_id197:setupIntegrationUserPermissions"]';
const SAVE_SELECTOR = 'input[name="page:form:j_id2:j_id3:j_id11"]';
const AUTHORIZE_NEW_CALCULATION_SERVICE_SELECTOR = 'span#page\\:form\\:pb\\:calculatorOptions\\:j_id201\\:j_id203 a';
const ALLOW_SELECTOR = 'input[name="save"]:not([id="oadeny"])';

export type SalesforceCpqConfigConfig = z.infer<typeof salesforceCpqConfigSchema> & { [key: string]: any };

export class SalesforceCpqConfig extends BrowserforcePlugin {
  private logger = this.browserforce.logger;
  public async retrieve(definition?: SalesforceCpqConfigConfig): Promise<SalesforceCpqConfigConfig> {
    await using page = await this.browserforce.openPage(BASE_PATH);
    await Promise.all([page.waitForEvent('load'), page.locator(CONFIGURE_SELECTOR).click()]);

    const response = {} as SalesforceCpqConfigConfig;
    if (definition) {
      for (const [keyTab, valueTab] of Object.entries(formConfig)) {
        if (definition[keyTab]) {
          await page.locator(`td[id="${valueTab.id}"]`).click();
          for (const [keyItem, valueItem] of Object.entries(valueTab.properties)) {
            if (!(definition[keyTab][keyItem] === undefined)) {
              const item = valueItem;
              response[keyTab] = response[keyTab] || {};
              try {
                if (item.component === 'input' && item.type === 'boolean') {
                  response[keyTab][keyItem] = await page.locator(`${item.component}[name="${item.name}"]`).isChecked();
                } else if (item.component === 'input' && item.type === 'string') {
                  response[keyTab][keyItem] = await page.locator(`${item.component}[name="${item.name}"]`).inputValue();
                } else if (item.component === 'select') {
                  response[keyTab][keyItem] = await page
                    .locator(`${item.component}[name="${item.name}"] option:checked`)
                    .textContent();
                }
              } catch (e) {
                if (
                  e instanceof Error &&
                  e.message.includes(
                    `Error: failed to find element matching selector "${item.component}[name="${item.name}"]"`,
                  )
                ) {
                  this.logger?.warn(
                    `Label '${item.label}' '${keyTab}.${keyItem}' with component '${item.component}[name="${item.name}"]' is not found`,
                  );
                } else {
                  throw e;
                }
              }
            }
          }
        }
      }
    }
    return response;
  }

  public async apply(config: SalesforceCpqConfigConfig): Promise<void> {
    await using page = await this.browserforce.openPage(BASE_PATH);
    await Promise.all([page.waitForEvent('load'), page.locator(CONFIGURE_SELECTOR).click()]);

    /*
    This to click on the 'Generate Integration User Permissions button' for first time setup.
    Once the button is clicked, it will not be available for the next time.
    */
    this.logger?.log(`Checking for 'Generate Integration User Permissions' button`);
    await page.locator(`td[id="${formConfig.pricingAndCalculation.id}"]`).click();

    const generateButtonCount = await page.locator(GENERATE_INTEGRATION_USER_PERMISSIONS_SELECTOR).count();

    if (generateButtonCount > 0) {
      this.logger?.log(`Clicking on 'Generate Integration User Permissions' button`);
      await page.locator(GENERATE_INTEGRATION_USER_PERMISSIONS_SELECTOR).click();
    } else {
      this.logger?.log(
        `The button 'Generate Integration User Permissions' is not found. It might be already clicked before.`,
      );
    }

    /*
    This to loop through the formConfig and set the value based on the config provided.
    */
    for (const [keyTab, valueTab] of Object.entries(formConfig)) {
      if (config[keyTab]) {
        await page.locator(`td[id="${valueTab.id}"]`).click();
        for (const [keyItem, valueItem] of Object.entries(valueTab.properties)) {
          if (!(config[keyTab][keyItem] === undefined)) {
            const item = valueItem;
            try {
              this.logger?.log(
                `Updating: '${keyTab}.${keyItem}' (${item.label}) with component '${item.component}[name="${item.name}"]' with value: '${config[keyTab][keyItem]}'`,
              );
              if (item.component === 'input' && item.type === 'boolean') {
                const checkbox = await page.locator(`input[name="${item.name}"]`);
                if (!(await checkbox.isDisabled())) {
                  if (config[keyTab][keyItem]) {
                    await checkbox.check();
                  } else {
                    await checkbox.uncheck();
                  }
                }
              } else if (item.component === 'input' && item.type === 'string') {
                await page.locator(`input[name="${item.name}"]`).fill(config[keyTab][keyItem]);
              } else if (item.component === 'select') {
                const optionLocators = await page.locator(`select[name="${item.name}"] option`).all();
                const selectFieldOptions = await Promise.all(
                  optionLocators.map(async (option) => ({
                    text: await option.textContent(),
                    value: await option.getAttribute('value'),
                  })),
                );
                const chooseFieldOption = selectFieldOptions.find((x) => x.text === config[keyTab][keyItem]);
                if (!chooseFieldOption) {
                  const availableOption = selectFieldOptions.map((option) => option.text);
                  throw new Error(
                    `Fail to set '${item.label}' with value '${
                      config[keyTab][keyItem]
                    }'. \nPlease make sure to select one of this available options: ${JSON.stringify(
                      availableOption,
                    )}\n`,
                  );
                }
                await page.locator(`select[name="${item.name}"]`).selectOption(chooseFieldOption.value);
              }
              if (item.immediatelySave) {
                await Promise.all([page.waitForEvent('load'), page.locator(SAVE_SELECTOR).click()]);
              }
            } catch (e) {
              if (
                e instanceof Error &&
                e.message.includes(
                  `Error: failed to find element matching selector "${item.component}[name="${item.name}"]"`,
                )
              ) {
                this.logger?.warn(
                  `Label '${item.label}' '${keyTab}.${keyItem}' with component '${item.component}[name="${item.name}"]' is not found`,
                );
              } else {
                this.logger?.warn(
                  `Error: at Label '${item.label}' '${keyTab}.${keyItem}' with component '${
                    item.component
                  }[name="${item.name}"]' with message: ${e instanceof Error ? e.message : String(e)}`,
                );
                throw e;
              }
            }
          }
        }
      }
      await Promise.all([page.waitForEvent('load'), page.locator(SAVE_SELECTOR).click()]);
    }

    /*
    This to click on the 'Authorize New Calculation Service' link under Pricing and Calculation tab.
    Once authorized, it will not appear the next time.
    */
    try {
      this.logger?.log(`'Authorize New Calculation Service' link`);
      await page.locator(`td[id="${formConfig.pricingAndCalculation.id}"]`).click();

      const authorizeLinkCount = await page.locator(AUTHORIZE_NEW_CALCULATION_SERVICE_SELECTOR).count();

      if (authorizeLinkCount > 0) {
        // Click on 'Authorize New Calculation Service' link and wait for popup
        const popupPromise = page.context().waitForEvent('page', (newPage) => newPage.url().includes(AUTH_PATH));
        await page.locator(AUTHORIZE_NEW_CALCULATION_SERVICE_SELECTOR).click();
        await using newPage = await popupPromise;

        if (newPage) {
          // Click on 'Allow' button
          await Promise.all([
            page.waitForEvent('load'), // Wait for the main page to refresh
            newPage.locator(ALLOW_SELECTOR).click(),
          ]);

          this.logger?.log('The main page has refreshed after allowing.');
        } else {
          this.logger?.warn('Failed to retrieve the new page from the popup.');
        }
        this.logger?.log('The authorization process has been completed.');
      } else {
        this.logger?.log(
          `The link 'Authorize New Calculation Service' was not found. It might be already clicked before.`,
        );
      }
    } catch (e) {
      if (
        e instanceof Error &&
        e.message.includes(`No element found for selector: ${AUTHORIZE_NEW_CALCULATION_SERVICE_SELECTOR}`)
      ) {
        this.logger?.log(
          `The link Authorize New Calculation Service' is not found. It might be already clicked before.`,
        );
      } else if (
        e instanceof Error &&
        e.message.includes(
          `Waiting for selector \`input[name="save"]\` failed: waitForFunction failed: frame got detached.`,
        )
      ) {
        this.logger?.log(`ALLOW button is not found. It might be already clicked before.`);
      } else {
        this.logger?.warn(
          `Error clicking Authorize New Calculation Service' button with message: ${
            e instanceof Error ? e.message : String(e)
          }`,
        );
        throw e;
      }
    }
  }
}
