import type { Locator, Page } from 'playwright';
import { waitForPageErrors } from '../../../browserforce.js';
import { BrowserforcePlugin } from '../../../plugin.js';

const CAPACITY_MODEL_SELECTOR = 'select[id$=":capacityModelSection:editCapacityModel"]';
const OWNER_CHANGE_CAPACITY_SELECTOR = 'input[name*=":ownerChangeCapacityCheck"]';
const SAVE_BUTTON_SELECTOR = 'input[id$=":save"]';
const STATUS_FIELD_SELECTOR = 'select[id$=":statusFieldSection:editCapacityModel"]';
const STATUS_CHANGE_CAPACITY_SELECTOR = 'input[name*=":statusChangeCapacityCheck"]';
const VALUES_COMPLETED_SELECTOR = 'select#completedList';
const VALUES_IN_PROGRESS_SELECTOR = 'select#inProgressList';
const VALUES_PAUSED_SELECTOR = 'select#pausedList';
// the values are moved between the three lists via javascript, always passing through the paused list
const moveButtonSelector = (source: string, target: string) =>
  `a[onclick*="moveSelectedItems('${source}', '${target}')"]`;
const MOVE_COMPLETED_TO_PAUSED_SELECTOR = moveButtonSelector('completedList', 'pausedList');
const MOVE_IN_PROGRESS_TO_PAUSED_SELECTOR = moveButtonSelector('inProgressList', 'pausedList');
const MOVE_PAUSED_TO_COMPLETED_SELECTOR = moveButtonSelector('pausedList', 'completedList');
const MOVE_PAUSED_TO_IN_PROGRESS_SELECTOR = moveButtonSelector('pausedList', 'inProgressList');

type ServiceChannel = {
  serviceChannelDeveloperName: string;
  capacity: CapacityConfig;
};

export type CapacityConfig = {
  capacityModel?: 'TabBased' | 'StatusBased';
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

    const capacityModel = (await page
      .locator(`${CAPACITY_MODEL_SELECTOR}`)
      .inputValue()) as CapacityConfig['capacityModel'];

    if (capacityModel === 'StatusBased') {
      const statusField = await page.locator(`${STATUS_FIELD_SELECTOR}`).inputValue();
      const valuesForInProgress = await listValues(page.locator(VALUES_IN_PROGRESS_SELECTOR));
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
      if (definition.capacityModel === 'TabBased') {
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
        JSON.stringify([...(definition.valuesForInProgress ?? [])].sort()) !==
        JSON.stringify([...(state.valuesForInProgress ?? [])].sort())
      ) {
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

    if (configCapacity?.valuesForInProgress) {
      // the lists are populated asynchronously after selecting the status field
      await page
        .locator(
          `${VALUES_IN_PROGRESS_SELECTOR} > option, ${VALUES_PAUSED_SELECTOR} > option, ${VALUES_COMPLETED_SELECTOR} > option`,
        )
        .first()
        .waitFor();

      const inProgressValues = await listValues(page.locator(VALUES_IN_PROGRESS_SELECTOR));
      const valuesToRemove = inProgressValues.filter((value) => !configCapacity.valuesForInProgress.includes(value));
      const valuesToAdd = configCapacity.valuesForInProgress.filter((value) => !inProgressValues.includes(value));

      // a value can only be moved to an adjacent list, so it always passes through the paused list
      for (const value of valuesToRemove) {
        await moveValue(page, value, VALUES_IN_PROGRESS_SELECTOR, MOVE_IN_PROGRESS_TO_PAUSED_SELECTOR);
        await moveValue(page, value, VALUES_PAUSED_SELECTOR, MOVE_PAUSED_TO_COMPLETED_SELECTOR);
      }

      for (const value of valuesToAdd) {
        const pausedValues = await listValues(page.locator(VALUES_PAUSED_SELECTOR));
        if (!pausedValues.includes(value)) {
          await moveValue(page, value, VALUES_COMPLETED_SELECTOR, MOVE_COMPLETED_TO_PAUSED_SELECTOR);
        }
        await moveValue(page, value, VALUES_PAUSED_SELECTOR, MOVE_PAUSED_TO_IN_PROGRESS_SELECTOR);
      }
    }

    if (configCapacity?.checkAgentCapacityOnReopenedWorkItems !== undefined) {
      await page
        .locator(STATUS_CHANGE_CAPACITY_SELECTOR)
        .setChecked(configCapacity.checkAgentCapacityOnReopenedWorkItems);
    }

    if (configCapacity?.checkAgentCapacityOnReassignedWorkItems !== undefined) {
      await page
        .locator(OWNER_CHANGE_CAPACITY_SELECTOR)
        .setChecked(configCapacity.checkAgentCapacityOnReassignedWorkItems);
    }

    // Save the settings and wait for page refresh
    await page.locator(SAVE_BUTTON_SELECTOR).first().click();
    await Promise.race([page.waitForURL((url) => !url.pathname.endsWith('/e')), waitForPageErrors(page)]);
  }
}

/**
 * The values of a list in alphabetical order,
 * because the page renders them in picklist order which is not stable.
 */
async function listValues(listLocator: Locator): Promise<string[]> {
  const values = (await listLocator.locator('option').allTextContents()).map((value) => value.trim());
  return values.sort();
}

async function moveValue(page: Page, value: string, sourceSelector: string, moveButtonSelector: string): Promise<void> {
  await page.locator(sourceSelector).selectOption({ label: value });
  await page.locator(moveButtonSelector).click();
}
