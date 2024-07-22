import { BrowserforcePlugin } from '../../../plugin';

const SELECTORS = {
  CAPACITY_MODEL: 'select[id$=":capacityModelSection:editCapacityModel"]',
  OWNER_CHANGE_CAPACITY: 'input[name*=":ownerChangeCapacityCheck"]',
  SAVE_BUTTON: 'input[id$=":save"]',
  STATUS_FIELD: 'select[id$=":statusFieldSection:editCapacityModel"]',
  STATUS_CHANGE_CAPACITY: 'input[name*=":statusChangeCapacityCheck"]',
  VALUES_IN_PROGRESS: 'select[id$=":statusFieldValues:duelingListBox:backingList_s"]'
};

type Config = {
  serviceChannelDeveloperName?: string,
  capacity?: CapacityConfig;
}

export type CapacityConfig = {
  capacityModel?: string;
  statusField?: string;
  valuesForInProgress?: string[];
  checkAgentCapacityOnReopenedWorkItems?: boolean;
  checkAgentCapacityOnReasignedWorkItems?: boolean;
}

export class Capacity extends BrowserforcePlugin {
  public async retrieve(definition: Config): Promise<CapacityConfig> {
    const conn = this.org.getConnection();

    // Query for the service channel
    const serviceChannelDeveloperName = definition.serviceChannelDeveloperName;
    const serviceChannel = await conn.singleRecordQuery(
      `SELECT Id FROM ServiceChannel WHERE DeveloperName='${serviceChannelDeveloperName}'`
    );

    // Open the service channel setup page
    const page = await this.browserforce.openPage(`${serviceChannel.Id}/e`);

    // Retrieve the service channel config
    const capacityModel = (await page.$eval(`${SELECTORS.CAPACITY_MODEL} > option[selected]`, (el) => el.textContent)) ?? '';

    if (capacityModel === 'Status-based') {
      const statusField = (await page.$eval(`${SELECTORS.STATUS_FIELD} > option[selected]`, (el) => el.textContent)) ?? '';
      const valuesForInProgress = await page.$$eval(`${SELECTORS.VALUES_IN_PROGRESS} > option[title]`, (options) => {
        return options.map((option) => option.textContent ?? '');
      });
      const checkAgentCapacityOnReopenedWorkItems = await page.$eval(SELECTORS.STATUS_CHANGE_CAPACITY, (el) =>
        el.getAttribute('checked') === 'checked' ? true : false
      );
      const checkAgentCapacityOnReasignedWorkItems = await page.$eval(SELECTORS.OWNER_CHANGE_CAPACITY, (el) =>
        el.getAttribute('checked') === 'checked' ? true : false
      );

      return {
        capacityModel,
        statusField,
        valuesForInProgress,
        checkAgentCapacityOnReopenedWorkItems,
        checkAgentCapacityOnReasignedWorkItems
      };
    }

    return { capacityModel };
  }

  public diff(state?: CapacityConfig, definition?: CapacityConfig): CapacityConfig | undefined {
    const response: CapacityConfig = {};

    if (state && definition) {
      if (definition.capacityModel === 'Tab-based') {
        if (definition.capacityModel !== state.capacityModel) {
          response.capacityModel = definition.capacityModel;
          return response;
        }
        return undefined
      }

      if (definition.statusField !== state.statusField) {
        response.statusField = definition.statusField;
      }

      if (definition.valuesForInProgress !== state.valuesForInProgress) {
        response.valuesForInProgress = definition.valuesForInProgress;
      }

      if (definition.checkAgentCapacityOnReasignedWorkItems !== state.checkAgentCapacityOnReasignedWorkItems) {
        response.checkAgentCapacityOnReasignedWorkItems = definition.checkAgentCapacityOnReasignedWorkItems;
      }

      if (definition.checkAgentCapacityOnReopenedWorkItems !== state.checkAgentCapacityOnReopenedWorkItems) {
        response.checkAgentCapacityOnReopenedWorkItems = definition.checkAgentCapacityOnReopenedWorkItems;
      }
    }

    return Object.keys(response).length ? response : undefined;
  }

  public async apply(config: Config): Promise<void> {
    const conn = this.org.getConnection();

    // Query for the service channel
    const serviceChannelDeveloperName = config.serviceChannelDeveloperName;
    const serviceChannel = await conn.singleRecordQuery(
      `SELECT Id FROM ServiceChannel WHERE DeveloperName='${serviceChannelDeveloperName}'`
    );

    // Open the service channel setup page
    const page = await this.browserforce.openPage(`${serviceChannel.Id}/e`);

    // Update the service channel config
    const configCapacity = config.capacity;

    if (configCapacity!.capacityModel) {
      await page.select(SELECTORS.CAPACITY_MODEL, configCapacity!.capacityModel);
    }

    // Save the settings
    await page.click(SELECTORS.SAVE_BUTTON);
    await page.close();
  }
}
