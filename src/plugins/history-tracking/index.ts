import { BrowserforcePlugin } from '../../plugin.js';

const PATHS = {
  BASE: 'lightning/setup/ObjectManager/{APINAME}/FieldsAndRelationships/setTrackingHistory'
};

const SELECTORS = {
  ENABLE_HISTORY: 'input[id$="enable"]',
  ENABLE_FIELD_HISTORY: 'input[id$="{APINAME}_fht"]',
  SAVE_BUTTON: 'input[id$=":save"]'
};

type HistoryTrackingConfig = {
  objectApiName: string;
  enableHistoryTracking: boolean;
  fieldHistoryTracking: FieldHistoryTrackingConfig[];
};

export type FieldHistoryTrackingConfig = {
  fieldApiName: string;
  enableHistoryTracking: boolean;
}

export class HistoryTracking extends BrowserforcePlugin {
  public async retrieve(definition?: HistoryTrackingConfig[]): Promise<HistoryTrackingConfig[]> {
    const historyTrackingConfigs: HistoryTrackingConfig[] = [];

    const customObjectsByDeveloperName = new Map();

    const customObjectApiNames = definition.filter(
      historyTracking => historyTracking.objectApiName.includes('__c')
    ).map(historyTracking => `'${historyTracking.objectApiName}'`);

    if (customObjectApiNames) {
      const customObjectsQuery = await this.org.getConnection().tooling.query(
        `SELECT Id, DeveloperName FROM CustomObject WHERE DeveloperName IN (${customObjectApiNames.join(",")})`
      );
  
      for (const customObject of customObjectsQuery.records) {
        customObjectsByDeveloperName.set(customObject.DeveloperName, customObject.Id);
      }
    }

    for await (const historyTrackingConfig of definition) {
      const historyTrackingResult = {...historyTrackingConfig };

      const customFieldsByDeveloperName = new Map();

      const customFieldApiNames = historyTrackingConfig.fieldHistoryTracking.filter(
        fieldHistoryTracking => fieldHistoryTracking.fieldApiName.includes('__c')
      ).map(fieldHistoryTracking => fieldHistoryTracking.fieldApiName);

      if (customFieldApiNames) {
        const customFieldsQuery = await this.org.getConnection().tooling.query(
          `SELECT Id, DeveloperName FROM CustomField 
            WHERE DeveloperName IN (${customObjectApiNames.join(",")}) 
            AND TableOrEnumId = ${customObjectsByDeveloperName.get(historyTrackingConfig.objectApiName) ?? historyTrackingConfig.objectApiName}`
        );
  
        for (const customField of customFieldsQuery.records) {
          customFieldsByDeveloperName.set(customField.DeveloperName, customField.Id);
        }
      }

      // Open the object history tracking setup page
      const page = await this.browserforce.openPage(PATHS.BASE.replace('{APINAME}', historyTrackingConfig.objectApiName));

      // Retrieve the object history tracking
      historyTrackingResult.enableHistoryTracking =  await page.$eval(SELECTORS.ENABLE_HISTORY, (el) =>
        el.getAttribute('checked') === 'checked' ? true : false
      );

      for await (const fieldHistoryTracking of historyTrackingConfig.fieldHistoryTracking) {
        const fieldApiName = customFieldsByDeveloperName.get(fieldHistoryTracking.fieldApiName) ?? fieldHistoryTracking.fieldApiName;


      for await (const fieldHistoryTracking of historyTrackingConfig.fieldHistoryTracking) {
        let fieldApiName = fieldHistoryTracking.fieldApiName;



      }

      historyTrackingConfigs.push(historyTrackingResult);

    }

    return historyTrackingConfigs;

    }


  }

  public async apply(plan: HistoryTrackingConfig[]): Promise<void> {

  }
}
