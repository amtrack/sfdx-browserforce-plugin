import { waitForPageErrors } from '../../../browserforce.js';
import { BrowserforcePlugin } from '../../../plugin.js';

const ADD_BUTTON_SELECTOR = 'a[id$=":duelingListBox:backingList_add"]';
const CAPACITY_MODEL_SELECTOR = 'select[id$=":capacityModelSection:editCapacityModel"]';
const OWNER_CHANGE_CAPACITY_SELECTOR = 'input[name*=":ownerChangeCapacityCheck"]';
const REMOVE_BUTTON_SELECTOR = 'a[id$=":duelingListBox:backingList_remove"]';
const SAVE_BUTTON_SELECTOR = 'input[id$=":save"]';
const STATUS_FIELD_SELECTOR = 'select[id$=":statusFieldSection:editCapacityModel"]';
const STATUS_CHANGE_CAPACITY_SELECTOR = 'input[name*=":statusChangeCapacityCheck"]';
const VALUES_COMPLETED_SELECTOR = 'select[id$=":statusFieldValues:duelingListBox:backingList_a"]';
const VALUES_IN_PROGRESS_SELECTOR = 'select[id$=":statusFieldValues:duelingListBox:backingList_s"]';

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
    const serviceChannel = await this.browserforce.connection.singleRecordQuery(
      `SELECT Id FROM ServiceChannel WHERE DeveloperName='${serviceChannelDeveloperName}'`,
    );

    // Open the service channel setup page
    await using page = await this.browserforce.openPage(`/${serviceChannel.Id}/e`);

    // Retrieve the service channel config
    const capacityModelCount = await page.locator(CAPACITY_MODEL_SELECTOR).count();
    if (capacityModelCount === 0) {
      return {};
    }

    const capacityModel = await page.locator(`${CAPACITY_MODEL_SELECTOR}`).inputValue();

    if (capacityModel === 'StatusBased') {
      const statusField = await page.locator(`${STATUS_FIELD_SELECTOR}`).inputValue();
      const inProgressOptionsLocator = page.locator(VALUES_IN_PROGRESS_SELECTOR).locator('option:not(:disabled)');
      const valuesForInProgress = await Promise.all(
        (await inProgressOptionsLocator.all()).map((option) => option.getAttribute('title')),
      );
      const checkAgentCapacityOnReopenedWorkItems = await page.locator(STATUS_CHANGE_CAPACITY_SELECTOR).isChecked();
      const checkAgentCapacityOnReassignedWorkItems = await page.locator(OWNER_CHANGE_CAPACITY_SELECTOR).isChecked();

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

  public diff(state?: CapacityConfig, definition?: CapacityConfig): CapacityConfig | undefined {
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

      if (JSON.stringify(definition.valuesForInProgress) !== JSON.stringify(state.valuesForInProgress)) {
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

  public async apply(config: ServiceChannel): Promise<void> {
    // Query for the service channel
    const serviceChannelDeveloperName = config.serviceChannelDeveloperName;
    const serviceChannel = await this.browserforce.connection.singleRecordQuery(
      `SELECT Id FROM ServiceChannel WHERE DeveloperName='${serviceChannelDeveloperName}'`,
    );

    // Open the service channel setup page
    await using page = await this.browserforce.openPage(`/${serviceChannel.Id}/e`);

    // Update the service channel config
    const configCapacity = config.capacity;

    if (configCapacity?.capacityModel) {
      await page.locator(CAPACITY_MODEL_SELECTOR).selectOption(configCapacity!.capacityModel);
    }

    if (configCapacity?.statusField) {
      await page.locator(STATUS_FIELD_SELECTOR).selectOption(configCapacity!.statusField);
    }

    // TODO: find another condition
    await page.waitForLoadState('networkidle');

    if (configCapacity?.valuesForInProgress) {
      const completedOptionsLocator = page.locator(VALUES_COMPLETED_SELECTOR).locator('option:not(:disabled)');
      const completedOptions = await Promise.all(
        (await completedOptionsLocator.all()).map((option) => option.getAttribute('title')),
      );

      const inProgressOptionsLocator = page.locator(VALUES_IN_PROGRESS_SELECTOR).locator('option:not(:disabled)');
      const inProgressOptions = await Promise.all(
        (await inProgressOptionsLocator.all()).map((option) => option.getAttribute('title')),
      );

      for (const optionTitle of completedOptions) {
        if (configCapacity.valuesForInProgress.includes(optionTitle)) {
          await page.getByRole('option', { name: optionTitle, exact: true }).click();
          await page.locator(ADD_BUTTON_SELECTOR).click();
        }
      }

      for (const optionTitle of inProgressOptions) {
        if (!configCapacity.valuesForInProgress.includes(optionTitle)) {
          await page.getByRole('option', { name: optionTitle, exact: true }).click();
          await page.locator(REMOVE_BUTTON_SELECTOR).click();
        }
      }
    }

    if (configCapacity?.checkAgentCapacityOnReassignedWorkItems !== undefined) {
      await page
        .locator(STATUS_CHANGE_CAPACITY_SELECTOR)
        .setChecked(configCapacity.checkAgentCapacityOnReassignedWorkItems);
    }

    if (configCapacity?.checkAgentCapacityOnReopenedWorkItems !== undefined) {
      await page
        .locator(OWNER_CHANGE_CAPACITY_SELECTOR)
        .setChecked(configCapacity.checkAgentCapacityOnReopenedWorkItems);
    }

    // Save the settings and wait for page refresh
    await page.locator(SAVE_BUTTON_SELECTOR).first().click();
    await Promise.race([page.waitForURL((url) => !url.pathname.endsWith('/e')), waitForPageErrors(page)]);
  }
}
