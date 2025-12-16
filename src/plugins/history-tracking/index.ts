import { type SalesforceUrlPath, waitForPageErrors } from '../../browserforce.js';
import { BrowserforcePlugin } from '../../plugin.js';

const BASE_PATH: SalesforceUrlPath = `/ui/setup/layout/FieldHistoryTracking?pEntity={APINAME}&retURL=${encodeURIComponent('/setup/forcecomHomepage.apexp')}`;

const ENABLE_HISTORY_SELECTOR = 'input[type="checkbox"][id="enable"]';
const ENABLE_FIELD_HISTORY_SELECTOR = 'input[id="{APINAME}_fht"]';
const SAVE_BUTTON_SELECTOR = 'input[type="submit"][name="save"]';

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
  public async retrieve(definition?: HistoryTrackingConfig[]): Promise<HistoryTrackingConfig[]> {
    const historyTrackingConfigs: HistoryTrackingConfig[] = [];

    // We first need to retrieve the corresponding CustomField.TableOrEnumId for all objects
    // This is in case we have field tracking configured for custom fields
    const tableEnumOrIdByObjectApiName = await this.getTableEnumOrIdByObjectApiName(definition);

    // Now we can iterate over all history tracking configurations in the definition
    for (const historyTrackingConfig of definition) {
      const historyTrackingResult = { ...historyTrackingConfig };

      // Open the object history tracking setup page
      await using page = await this.browserforce.openPage(
        BASE_PATH.replace(
          '{APINAME}',
          tableEnumOrIdByObjectApiName.get(historyTrackingConfig.objectApiName),
        ) as SalesforceUrlPath,
      );

      // Retrieve the object history tracking
      // If this is a custom object, this checkbox does not exist, so skip
      if (!historyTrackingConfig.objectApiName.includes('__c')) {
        historyTrackingResult.enableHistoryTracking = await page.locator(ENABLE_HISTORY_SELECTOR).isChecked();
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
      const fieldSelectorByFieldApiName = await this.getFieldSelectorByFieldApiName(
        tableEnumOrIdByObjectApiName.get(historyTrackingConfig.objectApiName),
        historyTrackingConfig.fieldHistoryTracking,
      );

      // We can now retrieve the field history settings for the fields specified for the object
      for (const fieldHistoryTracking of historyTrackingConfig.fieldHistoryTracking) {
        const fieldHistoryTrackingResult = { ...fieldHistoryTracking };

        const fieldApiName = fieldSelectorByFieldApiName.get(fieldHistoryTracking.fieldApiName);

        fieldHistoryTrackingResult.enableHistoryTracking = await page
          .locator(ENABLE_FIELD_HISTORY_SELECTOR.replace('{APINAME}', fieldApiName))
          .isChecked();

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
    const tableEnumOrIdByObjectApiName = await this.getTableEnumOrIdByObjectApiName(plan);

    // Now we can iterate over all history tracking configurations in the plan
    for (const historyTrackingConfig of plan) {
      // Open the object history tracking setup page
      await using page = await this.browserforce.openPage(
        BASE_PATH.replace(
          '{APINAME}',
          tableEnumOrIdByObjectApiName.get(historyTrackingConfig.objectApiName),
        ) as SalesforceUrlPath,
      );

      // Retrieve the object history tracking
      // If this is a custom object, this checkbox does not exist, so skip
      if (!historyTrackingConfig.objectApiName.includes('__c')) {
        const historyTrackingEnabled = await page.locator(ENABLE_HISTORY_SELECTOR).isChecked();

        if (historyTrackingConfig.enableHistoryTracking !== historyTrackingEnabled) {
          // Click the checkbox
          await page.locator(ENABLE_HISTORY_SELECTOR).click();
        }
      }

      if (historyTrackingConfig.fieldHistoryTracking) {
        // We need to determine the correct html selector for each field that is configured
        // This is because custom fields are identified using their CustomField.Id value
        const fieldSelectorByFieldApiName = await this.getFieldSelectorByFieldApiName(
          tableEnumOrIdByObjectApiName.get(historyTrackingConfig.objectApiName),
          historyTrackingConfig.fieldHistoryTracking,
        );

        // We can now retrieve the field history settings for the fields specified for the object
        for (const fieldHistoryTracking of historyTrackingConfig.fieldHistoryTracking) {
          const fieldApiName = fieldSelectorByFieldApiName.get(fieldHistoryTracking.fieldApiName);

          const fieldSelector = ENABLE_FIELD_HISTORY_SELECTOR.replace('{APINAME}', fieldApiName);

          const fieldHistoryTrackingEnabled = await page.locator(fieldSelector).isChecked();

          if (fieldHistoryTracking.enableHistoryTracking !== fieldHistoryTrackingEnabled) {
            // Click the checkbox
            await page.locator(fieldSelector).click();
          }
        }
      }

      // Save the settings
      await page
        .locator(SAVE_BUTTON_SELECTOR)
        .filter({ visible: true }) // there are three save buttons [not visible, top row, bottom row]
        .first()
        .click();
      await Promise.race([
        page.waitForURL((url) => url.pathname.startsWith('/setup/forcecomHomepage.apexp')),
        waitForPageErrors(page),
      ]);
    }
  }

  private async getFieldSelectorByFieldApiName(
    tableEnumOrId: String,
    fieldHistoryTrackingConfigs: FieldHistoryTrackingConfig[],
  ) {
    const fieldSelectorByFieldApiName = new Map();

    const customFieldApiNames = [];
    const personAccountFieldApiNames = [];

    for (const fieldHistoryTrackingConfig of fieldHistoryTrackingConfigs) {
      // If this is a person account field, we must do special handling for this
      if (tableEnumOrId === 'Account' && fieldHistoryTrackingConfig.fieldApiName.includes('__pc')) {
        personAccountFieldApiNames.push(`'${fieldHistoryTrackingConfig.fieldApiName.replace('__pc', '')}'`);
        continue;
      }

      // If this is a custom field, we must query for the Field Id
      if (fieldHistoryTrackingConfig.fieldApiName.includes('__c')) {
        customFieldApiNames.push(`'${fieldHistoryTrackingConfig.fieldApiName.replace('__c', '')}'`);
        continue;
      }

      // Otherwise, if this is a standard field, the Selector is the Field API Name
      fieldSelectorByFieldApiName.set(fieldHistoryTrackingConfig.fieldApiName, fieldHistoryTrackingConfig.fieldApiName);
    }

    if (customFieldApiNames.length === 0 && personAccountFieldApiNames.length === 0) {
      return fieldSelectorByFieldApiName;
    }

    if (personAccountFieldApiNames.length > 0) {
      // NOTE: Unfortunately this includes deleted records
      // WORKAROUND: ORDER BY CreatedDate
      const personAccountFieldsQuery = await this.org
        .getConnection()
        .tooling.query(
          `SELECT Id, DeveloperName FROM CustomField WHERE DeveloperName IN (${personAccountFieldApiNames.join(
            ',',
          )}) AND TableEnumOrId = 'Contact' ORDER By CreatedDate ASC`,
        );

      for (const personAccountField of personAccountFieldsQuery.records) {
        fieldSelectorByFieldApiName.set(
          `${personAccountField.DeveloperName}__pc`,
          personAccountField.Id.substring(0, 15),
        );
      }
    }

    if (customFieldApiNames.length > 0) {
      // NOTE: Unfortunately this includes deleted records
      // WORKAROUND: ORDER BY CreatedDate
      const customFieldsQuery = await this.org
        .getConnection()
        .tooling.query(
          `SELECT Id, DeveloperName FROM CustomField WHERE DeveloperName IN (${customFieldApiNames.join(
            ',',
          )}) AND TableEnumOrId = '${tableEnumOrId}' ORDER By CreatedDate ASC`,
        );

      for (const customField of customFieldsQuery.records) {
        fieldSelectorByFieldApiName.set(`${customField.DeveloperName}__c`, customField.Id.substring(0, 15));
      }
    }

    return fieldSelectorByFieldApiName;
  }

  private async getTableEnumOrIdByObjectApiName(historyTrackingConfigs: HistoryTrackingConfig[]) {
    const tableEnumOrIdByObjectApiName = new Map();

    const customObjectApiNames = [];

    for (const historyTrackingConfig of historyTrackingConfigs) {
      // If it is a custom object, the CustomField.TableEnumOrId is the Object Id
      if (historyTrackingConfig.objectApiName.includes('__c')) {
        customObjectApiNames.push(`'${historyTrackingConfig.objectApiName.replace('__c', '')}'`);
        continue;
      }

      // Otherwise, if this is a standard object, the CustomField.TableEnumOrId is the Object API Name
      tableEnumOrIdByObjectApiName.set(historyTrackingConfig.objectApiName, historyTrackingConfig.objectApiName);
    }

    if (customObjectApiNames.length === 0) {
      return tableEnumOrIdByObjectApiName;
    }

    // NOTE: Unfortunately this includes deleted records
    // WORKAROUND: ORDER BY CreatedDate
    const customObjectsQuery = await this.org
      .getConnection()
      .tooling.query(
        `SELECT Id, DeveloperName FROM CustomObject WHERE DeveloperName IN (${customObjectApiNames.join(
          ',',
        )}) ORDER BY CreatedDate ASC`,
      );

    for (const customObject of customObjectsQuery.records) {
      tableEnumOrIdByObjectApiName.set(`${customObject.DeveloperName}__c`, customObject.Id);
    }

    return tableEnumOrIdByObjectApiName;
  }
}
