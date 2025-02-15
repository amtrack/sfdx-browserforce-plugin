import { BrowserforcePlugin } from '../../plugin.js';

const PATHS = {
  BASE: 'lightning/setup/ObjectManager/{APINAME}/FieldsAndRelationships/setHistoryTracking',
};

const SELECTORS = {
  ENABLE_HISTORY: 'input[id="enable"]',
  ENABLE_FIELD_HISTORY: 'input[id$="{APINAME}_fht"]',
  SAVE_BUTTON: 'input[id$=":save"]',
};

type HistoryTrackingConfig = {
  objectApiName: string;
  enableHistoryTracking: boolean;
  fieldHistoryTracking: FieldHistoryTrackingConfig[];
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

    // We need to retrieve the CustomObject details for all custom objects specified in the config
    // This is because later on, we need the Id when retrieving any CustomField definitions
    const customObjectsByDeveloperName = new Map();
    
    const customObjectApiNames = definition
      .filter((historyTracking) =>
        historyTracking.objectApiName.includes('__c')
      )
      .map((historyTracking) => `'${historyTracking.objectApiName}'`);

    if (customObjectApiNames.length > 0) {
      const customObjectsQuery = await this.org
        .getConnection()
        .tooling.query(
          `SELECT Id, DeveloperName FROM CustomObject WHERE DeveloperName IN (${customObjectApiNames.join(
            ','
          )})`
        );

      for (const customObject of customObjectsQuery.records) {
        customObjectsByDeveloperName.set(
          customObject.DeveloperName,
          customObject.Id
        );
      }
    }

    for await (const historyTrackingConfig of definition) {
      const historyTrackingResult = { ...historyTrackingConfig };

      // Open the object history tracking setup page
      const page = await this.browserforce.openPage(
        PATHS.BASE.replace('{APINAME}', historyTrackingConfig.objectApiName)
      );

      // Retrieve the object history tracking
      await page.waitForSelector(`${SELECTORS.ENABLE_HISTORY}`);
      historyTrackingResult.enableHistoryTracking = await page.$eval(
        SELECTORS.ENABLE_HISTORY,
        (el) => (el.getAttribute('checked') === 'checked' ? true : false)
      );

      // If we have no field history tracking, there is nothing more to do
      if (!historyTrackingConfig.fieldHistoryTracking) {
        historyTrackingConfigs.push(historyTrackingResult);
        continue;
      }

      // We need to retrieve the CustomField details for all custom fields for this config
      // This is because we need the Id to find the inputs for custom fields in the UI
      const customFieldsByDeveloperName = new Map();

      const customFieldApiNames = historyTrackingConfig.fieldHistoryTracking
        .filter((fieldHistoryTracking) =>
          fieldHistoryTracking.fieldApiName.includes('__c')
        )
        .map((fieldHistoryTracking) => fieldHistoryTracking.fieldApiName);

      if (customFieldApiNames) {
        const customFieldsQuery = await this.org
          .getConnection()
          .tooling.query(
            `SELECT Id, DeveloperName FROM CustomField WHERE DeveloperName IN (${customObjectApiNames.join(
              ','
            )}) AND TableEnumOrId = ${
              customObjectsByDeveloperName.get(
                historyTrackingConfig.objectApiName
              ) ?? historyTrackingConfig.objectApiName
            }`
          );

        for (const customField of customFieldsQuery.records) {
          customFieldsByDeveloperName.set(
            customField.DeveloperName,
            customField.Id
          );
        }
      }

      // We can now retrieve the field history settings for the fields specified for the object
      const fieldHistoryTrackingConfigs: FieldHistoryTrackingConfig[] = [];

      for await (const fieldHistoryTracking of historyTrackingConfig.fieldHistoryTracking) {
        const fieldHistoryTrackingResult = { ...fieldHistoryTracking };

        const fieldApiName =
          customFieldsByDeveloperName.get(fieldHistoryTracking.fieldApiName) ??
          fieldHistoryTracking.fieldApiName;

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

  public async apply(plan: HistoryTrackingConfig[]): Promise<void> {}
}
