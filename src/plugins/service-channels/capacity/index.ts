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
    const capacityModelCount = await page.locator(CAPACITY_MODEL_SELECTOR).count();
    if (capacityModelCount === 0) {
      await page.close();
      return {};
    }

    const capacityModel =
      (await page
        .locator(`${CAPACITY_MODEL_SELECTOR} > option[selected]`)
        .evaluate((el: HTMLOptionElement) => el.value)) ?? '';

    if (capacityModel === 'StatusBased') {
      const statusField =
        (await page
          .locator(`${STATUS_FIELD_SELECTOR} > option[selected]`)
          .evaluate((el: HTMLOptionElement) => el.value)) ?? '';
      const valuesForInProgress = await page
        .locator(`${VALUES_IN_PROGRESS_SELECTOR} > option`)
        .evaluateAll((options: HTMLOptionElement[]) => {
          return options.map((option) => option.title ?? '');
        });
      const checkAgentCapacityOnReopenedWorkItems = await page
        .locator(STATUS_CHANGE_CAPACITY_SELECTOR)
        .evaluate((el: HTMLInputElement) => (el.getAttribute('checked') === 'checked' ? true : false));
      const checkAgentCapacityOnReassignedWorkItems = await page
        .locator(OWNER_CHANGE_CAPACITY_SELECTOR)
        .evaluate((el: HTMLInputElement) => (el.getAttribute('checked') === 'checked' ? true : false));

      await page.close();
      return {
        capacityModel,
        statusField,
        valuesForInProgress,
        checkAgentCapacityOnReopenedWorkItems,
        checkAgentCapacityOnReassignedWorkItems,
      };
    }

    await page.close();
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
      await page.locator(CAPACITY_MODEL_SELECTOR).waitFor();
      await page.locator(CAPACITY_MODEL_SELECTOR).selectOption(configCapacity!.capacityModel);
    }

    if (configCapacity?.statusField) {
      await page.locator(STATUS_FIELD_SELECTOR).waitFor();
      await page.locator(STATUS_FIELD_SELECTOR).selectOption(configCapacity!.statusField);
    }

    if (configCapacity?.valuesForInProgress) {
      await page.locator(`${VALUES_COMPLETED_SELECTOR} > option`).first().waitFor();

      const completedElements = await page
        .locator(`${VALUES_COMPLETED_SELECTOR} > option`)
        .all();

      for (const completedElement of completedElements) {
        const optionTitle = await completedElement.getAttribute('title');

        if (
          optionTitle &&
          configCapacity.valuesForInProgress.includes(optionTitle)
        ) {
          await completedElement.click();
          await page.locator(ADD_BUTTON_SELECTOR).click();
        }
      }

      await page.locator(`${VALUES_IN_PROGRESS_SELECTOR} > option`).first().waitFor();
      const inprogressElements = await page
        .locator(`${VALUES_IN_PROGRESS_SELECTOR} > option`)
        .all();

      for (const inprogressElement of inprogressElements) {
        const optionTitle = await inprogressElement.getAttribute('title');

        if (
          optionTitle &&
          !configCapacity.valuesForInProgress.includes(optionTitle)
        ) {
          await inprogressElement.click();
          await page.locator(REMOVE_BUTTON_SELECTOR).click();
        }
      }
    }

    if (configCapacity?.checkAgentCapacityOnReassignedWorkItems !== undefined) {
      await page
        .locator(STATUS_CHANGE_CAPACITY_SELECTOR)
        .evaluate(
          (e: HTMLInputElement, v: boolean) => {
            e.checked = v;
          },
          configCapacity.checkAgentCapacityOnReassignedWorkItems
        );
    }

    if (configCapacity?.checkAgentCapacityOnReopenedWorkItems !== undefined) {
      await page
        .locator(OWNER_CHANGE_CAPACITY_SELECTOR)
        .evaluate(
          (e: HTMLInputElement, v: boolean) => {
            e.checked = v;
          },
          configCapacity.checkAgentCapacityOnReopenedWorkItems
        );
    }

    // Save the settings and wait for page refresh
    await page.locator(SAVE_BUTTON_SELECTOR).click();
    await page.waitForLoadState('load');

    // Close the page
    await page.close();
  }
}
