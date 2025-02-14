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
  fieldHistoryTracking: FieldHistoryTrackingConfig;
};

export type FieldHistoryTrackingConfig = {
  fieldApiName: string;
  enableHistoryTracking: boolean;
}

export class HistoryTracking extends BrowserforcePlugin {
  public async retrieve(definition?: HistoryTrackingConfig[]): Promise<HistoryTrackingConfig[]> {
    const historyTrackingConfigs: HistoryTrackingConfig[] = [];

    for await (const historyTrackingConfig of definition) {
      // Open the object history tracking setup page
      const page = await this.browserforce.openPage(PATHS.BASE.replace('{APINAME}', historyTrackingConfig.objectApiName));

      // Retrieve the object history tracking
      const enableHistoryTracking = await page.$eval(SELECTORS.ENABLE_HISTORY, (el) =>
        el.getAttribute('checked') === 'checked' ? true : false
      );

        // Query for the service channel
        const serviceChannelDeveloperName = definition.serviceChannelDeveloperName;
        const serviceChannel = await this.org.getConnection().singleRecordQuery(
          `SELECT Id FROM ServiceChannel WHERE DeveloperName='${serviceChannelDeveloperName}'`
        );
    

    
        // Retrieve the service channel config
        if (!await page.$(SELECTORS.CAPACITY_MODEL)) {
          return {};
        }
    
        const capacityModel = (await page.$eval(`${SELECTORS.CAPACITY_MODEL} > option[selected]`, (el) => el.value)) ?? '';
    
        if (capacityModel === 'StatusBased') {
          const statusField = (await page.$eval(`${SELECTORS.STATUS_FIELD} > option[selected]`, (el) => el.value)) ?? '';
          const valuesForInProgress = await page.$$eval(`${SELECTORS.VALUES_IN_PROGRESS} > option`, (options) => {
            return options.map((option) => option.title ?? '');
          });
          const checkAgentCapacityOnReopenedWorkItems = await page.$eval(SELECTORS.STATUS_CHANGE_CAPACITY, (el) =>
            el.getAttribute('checked') === 'checked' ? true : false
          );
          const checkAgentCapacityOnReassignedWorkItems = await page.$eval(SELECTORS.OWNER_CHANGE_CAPACITY, (el) =>
            el.getAttribute('checked') === 'checked' ? true : false
          );
    
          return {
            capacityModel,
            statusField,
            valuesForInProgress,
            checkAgentCapacityOnReopenedWorkItems,
            checkAgentCapacityOnReassignedWorkItems
          };
    }



    const pluginFieldHistoryTracking = new FieldHistoryTracking(this.browserforce);

    const historyTrackingConfigs: HistoryTrackingConfig[] = [];

    for await (const historyTrackingConfig of definition) {
      historyTrackingConfigs.push({
        objectApiName: historyTrackingConfig.objectApiName,
        enableHistoryTracking: historyTrackingConfig.enableHistoryTracking,
        fieldHistoryTracking: await pluginFieldHistoryTracking.retrieve(historyTrackingConfig)
      });
    }

    return historyTrackingConfigs;
  }

  public diff(state: ServiceChannel[], definition: ServiceChannel[]): ServiceChannel[] | undefined {
    const pluginCapacity = new Capacity(this.browserforce);

    const serviceChannels: ServiceChannel[] = [];

    for (const serviceChannelDefinition of definition) {
      const serviceChannelState = state.find(
        (serviceChannelState) => serviceChannelState.serviceChannelDeveloperName === serviceChannelDefinition.serviceChannelDeveloperName
      );
      
      const capacity = pluginCapacity.diff(serviceChannelState.capacity, serviceChannelDefinition.capacity);

      if (capacity !== undefined) {
        serviceChannels.push({
          serviceChannelDeveloperName: serviceChannelDefinition.serviceChannelDeveloperName, 
          capacity
        });
      }
    }

    return serviceChannels.length ? serviceChannels : undefined;
  }

  public async apply(plan: ServiceChannel[]): Promise<void> {
    const pluginCapacity = new Capacity(this.browserforce);

    for await (const serviceChannel of plan) {
      await pluginCapacity.apply(serviceChannel);
    }
  }
}
