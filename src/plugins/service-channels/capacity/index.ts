import { BrowserforcePlugin } from '../../../plugin.js';

const ADD_BUTTON_SELECTOR = 'a[id$=":duelingListBox:backingList_add"]';
const CAPACITY_MODEL_SELECTOR =
  'select[id$=":capacityModelSection:editCapacityModel"]';
const OWNER_CHANGE_CAPACITY_SELECTOR =
  'input[name*=":ownerChangeCapacityCheck"]';
const REMOVE_BUTTON_SELECTOR = 'a[id$=":duelingListBox:backingList_remove"]';
const SAVE_BUTTON_SELECTOR = 'input[id$=":save"]';
const STATUS_FIELD_SELECTOR =
  'select[id$=":statusFieldSection:editCapacityModel"]';
const STATUS_CHANGE_CAPACITY_SELECTOR =
  'input[name*=":statusChangeCapacityCheck"]';
const VALUES_COMPLETED_SELECTOR =
  'select[id$=":statusFieldValues:duelingListBox:backingList_a"]:not([disabled="disabled"])';
const VALUES_IN_PROGRESS_SELECTOR =
  'select[id$=":statusFieldValues:duelingListBox:backingList_s"]:not([disabled="disabled"])';

type ServiceChannel = {
  serviceChannelDeveloperName: string;
  capacity: CapacityConfig;
};

export type CapacityConfig = {
  capacityModel?: string;
  statusField?: string;
  valuesForInProgress?: string[];
  checkAgentCapacityOnReopenedWorkItems?: boolean;
  checkAgentCapacityOnReassignedWorkItems?: boolean;
};

export class Capacity extends BrowserforcePlugin {
  public async retrieve(definition: ServiceChannel): Promise<CapacityConfig> {
    // Query for the service channel
    const serviceChannelDeveloperName = definition.serviceChannelDeveloperName;
    const serviceChannel = await this.org
      .getConnection()
      .singleRecordQuery(
        `SELECT Id FROM ServiceChannel WHERE DeveloperName='${serviceChannelDeveloperName}'`
      );

    // Open the service channel setup page
    const page = await this.browserforce.openPage(`${serviceChannel.Id}/e`);

    // Retrieve the service channel config
    if (!(await page.$(CAPACITY_MODEL_SELECTOR))) {
      return {};
    }

    const capacityModel =
      (await page.$eval(
        `${CAPACITY_MODEL_SELECTOR} > option[selected]`,
        (el) => el.value
      )) ?? '';

    if (capacityModel === 'StatusBased') {
      const statusField =
        (await page.$eval(
          `${STATUS_FIELD_SELECTOR} > option[selected]`,
          (el) => el.value
        )) ?? '';
      const valuesForInProgress = await page.$$eval(
        `${VALUES_IN_PROGRESS_SELECTOR} > option`,
        (options) => {
          return options.map((option) => option.title ?? '');
        }
      );
      const checkAgentCapacityOnReopenedWorkItems = await page.$eval(
        STATUS_CHANGE_CAPACITY_SELECTOR,
        (el) => (el.getAttribute('checked') === 'checked' ? true : false)
      );
      const checkAgentCapacityOnReassignedWorkItems = await page.$eval(
        OWNER_CHANGE_CAPACITY_SELECTOR,
        (el) => (el.getAttribute('checked') === 'checked' ? true : false)
      );

      return {
        capacityModel,
        statusField,
        valuesForInProgress,
        checkAgentCapacityOnReopenedWorkItems,
        checkAgentCapacityOnReassignedWorkItems,
      };
    }

    return { capacityModel };
  }

  public diff(
    state?: CapacityConfig,
    definition?: CapacityConfig
  ): CapacityConfig | undefined {
    const response: CapacityConfig = {};

    if (state && definition) {
      if (definition.capacityModel === 'Tab-based') {
        if (definition.capacityModel !== state.capacityModel) {
          response.capacityModel = definition.capacityModel;
          return response;
        }
        return undefined;
      }

      if (definition.capacityModel !== state.capacityModel) {
        response.capacityModel = definition.capacityModel;
      }

      if (definition.statusField !== state.statusField) {
        response.statusField = definition.statusField;
      }

      if (
        JSON.stringify(definition.valuesForInProgress) !==
        JSON.stringify(state.valuesForInProgress)
      ) {
        response.valuesForInProgress = definition.valuesForInProgress;
      }

      if (
        definition.checkAgentCapacityOnReassignedWorkItems !==
        state.checkAgentCapacityOnReassignedWorkItems
      ) {
        response.checkAgentCapacityOnReassignedWorkItems =
          definition.checkAgentCapacityOnReassignedWorkItems;
      }

      if (
        definition.checkAgentCapacityOnReopenedWorkItems !==
        state.checkAgentCapacityOnReopenedWorkItems
      ) {
        response.checkAgentCapacityOnReopenedWorkItems =
          definition.checkAgentCapacityOnReopenedWorkItems;
      }
    }

    return Object.keys(response).length ? response : undefined;
  }

  public async apply(config: ServiceChannel): Promise<void> {
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
      await page.waitForSelector(CAPACITY_MODEL_SELECTOR);
      await page.select(CAPACITY_MODEL_SELECTOR, configCapacity!.capacityModel);
    }

    if (configCapacity?.statusField) {
      await page.waitForSelector(STATUS_FIELD_SELECTOR);
      await page.select(STATUS_FIELD_SELECTOR, configCapacity!.statusField);
    }

    if (configCapacity?.valuesForInProgress) {
      await page.waitForSelector(`${VALUES_COMPLETED_SELECTOR} > option`);

      const completedElements = await page.$$(
        `${VALUES_COMPLETED_SELECTOR} > option`
      );

      for (const completedElement of completedElements) {
        const optionTitle = (
          await completedElement.evaluate((node) => node.getAttribute('title'))
        )?.toString();

        if (
          optionTitle &&
          configCapacity.valuesForInProgress.includes(optionTitle)
        ) {
          await completedElement.click();
          await page.click(ADD_BUTTON_SELECTOR);
        }
      }

      await page.waitForSelector(`${VALUES_IN_PROGRESS_SELECTOR} > option`);
      const inprogressElements = await page.$$(
        `${VALUES_IN_PROGRESS_SELECTOR} > option`
      );

      for (const inprogressElement of inprogressElements) {
        const optionTitle = (
          await inprogressElement.evaluate((node) => node.getAttribute('title'))
        )?.toString();

        if (
          optionTitle &&
          !configCapacity.valuesForInProgress.includes(optionTitle)
        ) {
          await inprogressElement.click();
          await page.click(REMOVE_BUTTON_SELECTOR);
        }
      }
    }

    if (configCapacity?.checkAgentCapacityOnReassignedWorkItems !== undefined) {
      await page.$eval(
        STATUS_CHANGE_CAPACITY_SELECTOR,
        (e: HTMLInputElement, v: boolean) => {
          e.checked = v;
        },
        configCapacity.checkAgentCapacityOnReassignedWorkItems
      );
    }

    if (configCapacity?.checkAgentCapacityOnReopenedWorkItems !== undefined) {
      await page.$eval(
        OWNER_CHANGE_CAPACITY_SELECTOR,
        (e: HTMLInputElement, v: boolean) => {
          e.checked = v;
        },
        configCapacity.checkAgentCapacityOnReopenedWorkItems
      );
    }

    // Save the settings and wait for page refresh
    await Promise.all([
      page.waitForNavigation(),
      page.click(SAVE_BUTTON_SELECTOR),
    ]);

    // Close the page
    await page.close();
  }
}
