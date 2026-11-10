import { z } from 'zod';
import { type Locator, type Page } from 'playwright';
import { waitForPageErrors } from '../../../page-errors.js';
import { BrowserforcePlugin } from '../../../plugin.js';

export const capacitySchema = z
  .object({
    capacityModel: z
      .enum(['TabBased', 'StatusBased'])
      .meta({
        title: 'Capacity Model',
      })
      .describe('Choose the service channel Capacity Model')
      .optional(),
    statusField: z
      .string()
      .meta({ title: 'Status Field' })
      .describe('API Name of the field used to track status')
      .optional(),
    valuesForInProgress: z
      .array(z.string())
      .meta({ title: 'Values for In-Progress' })
      .describe('Choose the field values for In-Progress work')
      .optional(),
    checkAgentCapacityOnReopenedWorkItems: z
      .boolean()
      .meta({
        title: 'Check agent capacity on reopened work items',
      })
      .describe('Check agent capacity on reopened work items')
      .optional(),
    checkAgentCapacityOnReassignedWorkItems: z
      .boolean()
      .meta({
        title: 'Check agent capacity on reassigned work items',
      })
      .describe('Check agent capacity on reassigned work items')
      .optional(),
  })
  .meta({
    id: 'capacity',
    title: 'Capacity Settings',
    if: { properties: { capacityModel: { const: 'Status-based' } } },
    then: { required: ['statusField', 'valuesForInProgress'] },
    else: { not: { required: ['statusField', 'valuesForInProgress'] } },
  });

const CAPACITY_MODEL_SELECTOR = 'select[id$=":capacityModelSection:editCapacityModel"]';
const OWNER_CHANGE_CAPACITY_SELECTOR = 'input[name*=":ownerChangeCapacityCheck"]';
const SAVE_BUTTON_SELECTOR = 'input[id$=":save"]';
const STATUS_FIELD_SELECTOR = 'select[id$=":statusFieldSection:editCapacityModel"]';
const STATUS_CHANGE_CAPACITY_SELECTOR = 'input[name*=":statusChangeCapacityCheck"]';

// The values of the status field are spread over three lists (In-Progress, Paused, Completed) since Salesforce added
// the Paused status. Values move one list at a time, through the links calling moveSelectedItems('<from>', '<to>').
const IN_PROGRESS_LIST = 'inProgressList';
const PAUSED_LIST = 'pausedList';
const COMPLETED_LIST = 'completedList';
const VALUE_LISTS_SELECTOR = `#${IN_PROGRESS_LIST}, #${PAUSED_LIST}, #${COMPLETED_LIST}`;
const moveLinkSelector = (from: string, to: string): string => `a[onclick*="moveSelectedItems('${from}', '${to}')"]`;

// Former layout with two lists (In-Progress and Completed), kept for the orgs that still show it
const LEGACY_ADD_BUTTON_SELECTOR = 'a[id$=":duelingListBox:backingList_add"]';
const LEGACY_REMOVE_BUTTON_SELECTOR = 'a[id$=":duelingListBox:backingList_remove"]';
const LEGACY_VALUES_COMPLETED_SELECTOR = 'select[id$=":statusFieldValues:duelingListBox:backingList_a"]';
const LEGACY_VALUES_IN_PROGRESS_SELECTOR = 'select[id$=":statusFieldValues:duelingListBox:backingList_s"]';

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

/** Labels of the enabled options of a list of values (the former layout put them in the title). */
async function listLabels(list: Locator): Promise<string[]> {
  const labels = await list
    .locator('option:not(:disabled)')
    .evaluateAll((options) => options.map((option) => option.getAttribute('title') ?? option.textContent ?? ''));
  return labels.map((label) => label.trim());
}

/** Moves the given values from one list to the next one, with the link between them. */
async function moveValues(page: Page, from: string, to: string, labels: string[]): Promise<void> {
  if (labels.length === 0) {
    return;
  }
  await page.locator(`#${from}`).selectOption(labels.map((label) => ({ label })));
  await page.locator(moveLinkSelector(from, to)).click();
  // the exact label: a substring would also match "Closed - Resolved" for "Closed" (strict mode violation)
  const last = labels[labels.length - 1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await page
    .locator(`#${to} option`)
    .filter({ hasText: new RegExp(`^\\s*${last}\\s*$`) })
    .first()
    .waitFor();
}

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
      await page.locator(`${VALUE_LISTS_SELECTOR}, ${LEGACY_VALUES_IN_PROGRESS_SELECTOR}`).first().waitFor();
      const inProgressList = (await page.locator(`#${IN_PROGRESS_LIST}`).count())
        ? page.locator(`#${IN_PROGRESS_LIST}`)
        : page.locator(LEGACY_VALUES_IN_PROGRESS_SELECTOR);
      const valuesForInProgress = await listLabels(inProgressList);
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

      // the page lists the values in the order of the picklist, whatever the order of the config
      const sorted = (values?: string[]): string => JSON.stringify(values ? [...values].sort() : values);
      if (sorted(definition.valuesForInProgress) !== sorted(state.valuesForInProgress)) {
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
      await page.locator(CAPACITY_MODEL_SELECTOR).selectOption(configCapacity.capacityModel);
    }

    if (configCapacity?.statusField) {
      // the status field appears once the page re-rendered the status-based capacity model
      await page.locator(STATUS_FIELD_SELECTOR).selectOption(configCapacity.statusField);
    }

    if (configCapacity?.valuesForInProgress) {
      // the lists of values appear once the page re-rendered them for the status field
      await page
        .locator(
          `#${COMPLETED_LIST} option, #${PAUSED_LIST} option, #${IN_PROGRESS_LIST} option, ${LEGACY_VALUES_COMPLETED_SELECTOR} option, ${LEGACY_VALUES_IN_PROGRESS_SELECTOR} option`,
        )
        .first()
        .waitFor({ state: 'attached' });
      if (await page.locator(`#${IN_PROGRESS_LIST}`).count()) {
        await this.setValuesForInProgress(page, configCapacity.valuesForInProgress);
      } else {
        await this.setLegacyValuesForInProgress(page, configCapacity.valuesForInProgress);
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

  /** In-Progress, Paused and Completed lists: values move through Paused to reach either end. */
  private async setValuesForInProgress(page: Page, valuesForInProgress: string[]): Promise<void> {
    const wanted = new Set(valuesForInProgress);
    const completed = await listLabels(page.locator(`#${COMPLETED_LIST}`));
    await moveValues(
      page,
      COMPLETED_LIST,
      PAUSED_LIST,
      completed.filter((label) => wanted.has(label)),
    );
    const paused = await listLabels(page.locator(`#${PAUSED_LIST}`));
    await moveValues(
      page,
      PAUSED_LIST,
      IN_PROGRESS_LIST,
      paused.filter((label) => wanted.has(label)),
    );
    const removed = (await listLabels(page.locator(`#${IN_PROGRESS_LIST}`))).filter((label) => !wanted.has(label));
    await moveValues(page, IN_PROGRESS_LIST, PAUSED_LIST, removed);
    await moveValues(page, PAUSED_LIST, COMPLETED_LIST, removed);
  }

  /** Former In-Progress and Completed lists. */
  private async setLegacyValuesForInProgress(page: Page, valuesForInProgress: string[]): Promise<void> {
    const completedOptions = await listLabels(page.locator(LEGACY_VALUES_COMPLETED_SELECTOR));
    const inProgressOptions = await listLabels(page.locator(LEGACY_VALUES_IN_PROGRESS_SELECTOR));

    for (const optionTitle of completedOptions) {
      if (valuesForInProgress.includes(optionTitle)) {
        await page.getByRole('option', { name: optionTitle, exact: true }).click();
        await page.locator(LEGACY_ADD_BUTTON_SELECTOR).click();
      }
    }

    for (const optionTitle of inProgressOptions) {
      if (!valuesForInProgress.includes(optionTitle)) {
        await page.getByRole('option', { name: optionTitle, exact: true }).click();
        await page.locator(LEGACY_REMOVE_BUTTON_SELECTOR).click();
      }
    }
  }
}
