import { BrowserforcePlugin } from '../../plugin.js';

const PATHS = {
  BASE: 'ui/setup/layout/FieldHistoryTracking?pEntity={APINAME}',
};

const SELECTORS = {
  ENABLE_HISTORY: 'input[id="enable"][type="checkbox"][name="enable"]',
  ENABLE_FIELD_HISTORY: 'input[id="{APINAME}_fht"]',
  SAVE_BUTTON: 'input[class="btn"][type="submit"][name="save"][title="Save"]',
};

type HistoryTrackingConfig = {
  objectApiName: string;
  enableHistoryTracking?: boolean;
  fieldHistoryTracking?: FieldHistoryTrackingConfig[];
};

export type FieldHistoryTrackingConfig = {
  fieldApiName: string;
  enableHistoryTracking: boolean;
};

export class HistoryTracking extends BrowserforcePlugin {
  public async retrieve(
    definition?: HistoryTrackingConfig[]
  ): Promise<HistoryTrackingConfig[]> {
    const historyTrackingConfigs: HistoryTrackingConfig[] = [];

    // We first need to retrieve the corresponding CustomField.TableOrEnumId for all objects
    // This is in case we have field tracking configured for custom fields
    const tableEnumOrIdByObjectApiName =
      await this.getTableEnumOrIdByObjectApiName(definition);

    // Now we can iterate over all history tracking configurations in the definition
    for await (const historyTrackingConfig of definition) {
      const historyTrackingResult = { ...historyTrackingConfig };

      // Open the object history tracking setup page
      const page = await this.browserforce.openPage(
        PATHS.BASE.replace('{APINAME}', tableEnumOrIdByObjectApiName.get(historyTrackingConfig.objectApiName))
      );

      // Retrieve the object history tracking
      // If this is a custom object, this checkbox does not exist, so skip
      if (!historyTrackingConfig.objectApiName.includes('__c')) {
        await page.waitForSelector(SELECTORS.ENABLE_HISTORY);

        historyTrackingResult.enableHistoryTracking = await page.$eval(
          SELECTORS.ENABLE_HISTORY,
          (el) => (el.getAttribute('checked') === 'checked' ? true : false)
        );
      }

      // If we have no field history tracking, there is nothing more to do
      if (!historyTrackingConfig.fieldHistoryTracking) {
        historyTrackingConfigs.push(historyTrackingResult);
        continue;
      }

      const fieldHistoryTrackingConfigs: FieldHistoryTrackingConfig[] = [];

      // If the object history tracking is false, then we already know all field history tracking is false
      // Only so long as this is a standard object
      if (!historyTrackingResult.enableHistoryTracking && !historyTrackingConfig.objectApiName.includes('__c')) {
        for (const fieldHistoryTracking of historyTrackingConfig.fieldHistoryTracking) {
          fieldHistoryTrackingConfigs.push({
            ...fieldHistoryTracking,
            enableHistoryTracking: false,
          });
        }

        historyTrackingResult.fieldHistoryTracking = fieldHistoryTrackingConfigs;
        historyTrackingConfigs.push(historyTrackingResult);
        continue;
      }

      // We need to determine the correct html selector for each field that is configured
      // This is because custom fields are identified using their CustomField.Id value
      const fieldSelectorByFieldApiName =
        await this.getFieldSelectorByFieldApiName(
          tableEnumOrIdByObjectApiName.get(historyTrackingConfig.objectApiName),
          historyTrackingConfig.fieldHistoryTracking
        );

      // We can now retrieve the field history settings for the fields specified for the object
      for await (const fieldHistoryTracking of historyTrackingConfig.fieldHistoryTracking) {
        const fieldHistoryTrackingResult = { ...fieldHistoryTracking };

        const fieldApiName = fieldSelectorByFieldApiName.get(
          fieldHistoryTracking.fieldApiName
        );

        fieldHistoryTrackingResult.enableHistoryTracking = await page.$eval(
          SELECTORS.ENABLE_FIELD_HISTORY.replace('{APINAME}', fieldApiName),
          (el) => (el.getAttribute('checked') === 'checked' ? true : false)
        );

        fieldHistoryTrackingConfigs.push(fieldHistoryTrackingResult);
      }

      historyTrackingResult.fieldHistoryTracking = fieldHistoryTrackingConfigs;
      historyTrackingConfigs.push(historyTrackingResult);
    }

    return historyTrackingConfigs;
  }

  public async apply(plan: HistoryTrackingConfig[]): Promise<void> {
    // We first need to retrieve the corresponding CustomField.TableOrEnumId for all objects
    // This is in case we are configuring field tracking for custom fields
    const tableEnumOrIdByObjectApiName =
      await this.getTableEnumOrIdByObjectApiName(plan);

    // Now we can iterate over all history tracking configurations in the plan
    for await (const historyTrackingConfig of plan) {
      // Open the object history tracking setup page
      const page = await this.browserforce.openPage(
        PATHS.BASE.replace('{APINAME}', tableEnumOrIdByObjectApiName.get(historyTrackingConfig.objectApiName))
      );

      // Retrieve the object history tracking
      // If this is a custom object, this checkbox does not exist, so skip
      if (!historyTrackingConfig.objectApiName.includes('__c')) {
        await page.waitForSelector(SELECTORS.ENABLE_HISTORY);

        const historyTrackingEnabled = await page.$eval(
          SELECTORS.ENABLE_HISTORY,
          (el) => (el.getAttribute('checked') === 'checked' ? true : false)
        );

        if (historyTrackingConfig.enableHistoryTracking !== historyTrackingEnabled) {
          // Click the checkbox
          const enableHistoryTracking = await page.waitForSelector(SELECTORS.ENABLE_HISTORY);
          await enableHistoryTracking.evaluate((node) => (node as HTMLElement).click());
        }
      }

      if (historyTrackingConfig.fieldHistoryTracking) {
        // We need to determine the correct html selector for each field that is configured
        // This is because custom fields are identified using their CustomField.Id value
        const fieldSelectorByFieldApiName =
          await this.getFieldSelectorByFieldApiName(
            tableEnumOrIdByObjectApiName.get(historyTrackingConfig.objectApiName),
            historyTrackingConfig.fieldHistoryTracking
          );

        // We can now retrieve the field history settings for the fields specified for the object
        for await (const fieldHistoryTracking of historyTrackingConfig.fieldHistoryTracking) {

          const fieldApiName = fieldSelectorByFieldApiName.get(
            fieldHistoryTracking.fieldApiName
          );

          const fieldSelector = SELECTORS.ENABLE_FIELD_HISTORY.replace('{APINAME}', fieldApiName);

          const fieldHistoryTrackingEnabled = await page.$eval(
            fieldSelector,
            (el) => (el.getAttribute('checked') === 'checked' ? true : false)
          );

          if (fieldHistoryTracking.enableHistoryTracking !== fieldHistoryTrackingEnabled) {
            // Click the checkbox
            const enableFieldHistoryTracking = await page.waitForSelector(fieldSelector);
            await enableFieldHistoryTracking.evaluate((node) => (node as HTMLElement).click());
          }
        }
      }
      
      // Save the settings
      const saveButton = await page.waitForSelector(SELECTORS.SAVE_BUTTON);
      await saveButton.evaluate((node) => (node as HTMLElement).click());

      // Wait for the page to refresh
      await page.waitForNavigation()

      // Close the page
      await page.close();
    }
  }

  private async getFieldSelectorByFieldApiName(
    tableEnumOrId: String,
    fieldHistoryTrackingConfigs: FieldHistoryTrackingConfig[]
  ) {
    const fieldSelectorByFieldApiName = new Map();

    const customFieldApiNames = [];
    const personAccountFieldApiNames = [];

    for (const fieldHistoryTrackingConfig of fieldHistoryTrackingConfigs) {
      // If this is a person account field, we must do special handling for this
      if (
        tableEnumOrId === 'Account' &&
        fieldHistoryTrackingConfig.fieldApiName.includes('__pc')
      ) {
        personAccountFieldApiNames.push(
          `'${fieldHistoryTrackingConfig.fieldApiName.replace('__pc', '')}'`
        );
        continue;
      }

      // If this is a custom field, we must query for the Field Id
      if (fieldHistoryTrackingConfig.fieldApiName.includes('__c')) {
        customFieldApiNames.push(
          `'${fieldHistoryTrackingConfig.fieldApiName.replace('__c', '')}'`
        );
        continue;
      }

      // Otherwise, if this is a standard field, the Selector is the Field API Name
      fieldSelectorByFieldApiName.set(
        fieldHistoryTrackingConfig.fieldApiName,
        fieldHistoryTrackingConfig.fieldApiName
      );
    }

    if (
      customFieldApiNames.length === 0 &&
      personAccountFieldApiNames.length === 0
    ) {
      return fieldSelectorByFieldApiName;
    }

    if (personAccountFieldApiNames.length > 0) {
      const personAccountFieldsQuery = await this.org
        .getConnection()
        .tooling.query(
          `SELECT Id, DeveloperName FROM CustomField WHERE DeveloperName IN (${personAccountFieldApiNames.join(
            ','
          )}) AND TableEnumOrId = 'Contact'`
        );

      for (const personAccountField of personAccountFieldsQuery.records) {
        fieldSelectorByFieldApiName.set(
          `${personAccountField.DeveloperName}__pc`,
          personAccountField.Id.substring(0, 15)
        );
      }
    }

    if (customFieldApiNames.length > 0) {
      const customFieldsQuery = await this.org
        .getConnection()
        .tooling.query(
          `SELECT Id, DeveloperName FROM CustomField WHERE DeveloperName IN (${customFieldApiNames.join(
            ','
          )}) AND TableEnumOrId = '${tableEnumOrId}'`
        );

      for (const customField of customFieldsQuery.records) {
        fieldSelectorByFieldApiName.set(
          `${customField.DeveloperName}__c`,
          customField.Id.substring(0, 15)
        );
      }
    }

    return fieldSelectorByFieldApiName;
  }

  private async getTableEnumOrIdByObjectApiName(
    historyTrackingConfigs: HistoryTrackingConfig[]
  ) {
    const tableEnumOrIdByObjectApiName = new Map();

    const customObjectApiNames = [];

    for (const historyTrackingConfig of historyTrackingConfigs) {
      // If it is a custom object, the CustomField.TableEnumOrId is the Object Id
      if (historyTrackingConfig.objectApiName.includes('__c')) {
        customObjectApiNames.push(
          `'${historyTrackingConfig.objectApiName.replace('__c', '')}'`
        );
        continue;
      }

      // Otherwise, if this is a standard object, the CustomField.TableEnumOrId is the Object API Name
      tableEnumOrIdByObjectApiName.set(
        historyTrackingConfig.objectApiName,
        historyTrackingConfig.objectApiName
      );
    }

    if (customObjectApiNames.length === 0) {
      return tableEnumOrIdByObjectApiName;
    }

    const customObjectsQuery = await this.org
      .getConnection()
      .tooling.query(
        `SELECT Id, DeveloperName FROM CustomObject WHERE DeveloperName IN (${customObjectApiNames.join(
          ','
        )})`
      );

    for (const customObject of customObjectsQuery.records) {
      tableEnumOrIdByObjectApiName.set(
        `${customObject.DeveloperName}__c`,
        customObject.Id
      );
    }

    return tableEnumOrIdByObjectApiName;
  }
}
