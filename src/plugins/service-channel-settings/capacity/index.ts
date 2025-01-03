import { BrowserforcePlugin } from '../../../plugin.js';

const SELECTORS = {
  ADD_BUTTON: 'a[id$=":duelingListBox:backingList_add"]',
  CAPACITY_MODEL: 'select[id$=":capacityModelSection:editCapacityModel"]',
  OWNER_CHANGE_CAPACITY: 'input[name*=":ownerChangeCapacityCheck"]',
  REMOVE_BUTTON: 'a[id$=":duelingListBox:backingList_remove"]',
  SAVE_BUTTON: 'input[id$=":save"]',
  STATUS_FIELD: 'select[id$=":statusFieldSection:editCapacityModel"]',
  STATUS_CHANGE_CAPACITY: 'input[name*=":statusChangeCapacityCheck"]',
  VALUES_COMPLETED: 'select[id$=":statusFieldValues:duelingListBox:backingList_a"]',
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
  checkAgentCapacityOnReassignedWorkItems?: boolean;
}

export class Capacity extends BrowserforcePlugin {
  public async retrieve(definition: Config): Promise<CapacityConfig> {
    // Query for the service channel
    const serviceChannelDeveloperName = definition.serviceChannelDeveloperName;
    const serviceChannel = await this.org.getConnection().singleRecordQuery(
      `SELECT Id FROM ServiceChannel WHERE DeveloperName='${serviceChannelDeveloperName}'`
    );

    // Open the service channel setup page
    const page = await this.browserforce.openPage(`${serviceChannel.Id}/e`);

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

      if (definition.capacityModel !== state.capacityModel) {
        response.capacityModel = definition.capacityModel;
      }

      if (definition.statusField !== state.statusField) {
        response.statusField = definition.statusField;
      }

      if (definition.valuesForInProgress !== state.valuesForInProgress) {
        response.valuesForInProgress = definition.valuesForInProgress;
      }

      if (definition.checkAgentCapacityOnReassignedWorkItems !== state.checkAgentCapacityOnReassignedWorkItems) {
        response.checkAgentCapacityOnReassignedWorkItems = definition.checkAgentCapacityOnReassignedWorkItems;
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

    if (configCapacity?.capacityModel) {
      await page.waitForSelector(SELECTORS.CAPACITY_MODEL);
      await page.select(SELECTORS.CAPACITY_MODEL, configCapacity!.capacityModel);
    }

    if (configCapacity?.statusField) {
      await page.waitForSelector(SELECTORS.STATUS_FIELD);
      await page.select(SELECTORS.STATUS_FIELD, configCapacity!.statusField);
    }

    if (configCapacity?.valuesForInProgress) {
      await page.waitForSelector(SELECTORS.VALUES_COMPLETED);
      await page.waitForSelector(SELECTORS.VALUES_IN_PROGRESS);

      const completedElements = await page.$$(`${SELECTORS.VALUES_COMPLETED} > option`);

      for (const completedElement of completedElements) {
        const optionTitle = (await completedElement.evaluate(node => node.getAttribute('title')))?.toString();

        if (optionTitle && configCapacity.valuesForInProgress.includes(optionTitle)) {
          await completedElement.click();
          await page.click(SELECTORS.ADD_BUTTON);
        }
      }

      const inprogressElements = await page.$$(`${SELECTORS.VALUES_IN_PROGRESS} > option`);

      for (const inprogressElement of inprogressElements) {
        const optionTitle = (await inprogressElement.evaluate(node => node.getAttribute('title')))?.toString();

        if (optionTitle && !configCapacity.valuesForInProgress.includes(optionTitle)) {
          await inprogressElement.click();
          await page.click(SELECTORS.REMOVE_BUTTON);
        }
      }
    }

    if (configCapacity?.checkAgentCapacityOnReassignedWorkItems !== undefined) {
      await page.$eval(
        SELECTORS.STATUS_CHANGE_CAPACITY,
        (e: HTMLInputElement, v: boolean) => {
          e.checked = v;
        },
        configCapacity.checkAgentCapacityOnReassignedWorkItems
      );
    }

    if (configCapacity?.checkAgentCapacityOnReopenedWorkItems !== undefined) {
      await page.$eval(
        SELECTORS.OWNER_CHANGE_CAPACITY,
        (e: HTMLInputElement, v: boolean) => {
          e.checked = v;
        },
        configCapacity.checkAgentCapacityOnReopenedWorkItems
      );
    }

    // Save the settings
    await page.click(SELECTORS.SAVE_BUTTON);
    await page.close();
  }
}
