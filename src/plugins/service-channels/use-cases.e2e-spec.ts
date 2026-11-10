import { defineUseCases } from '../../../scripts/use-cases.js';
import {
  CAPACITY_MODEL_SELECTOR,
  STATUS_FIELD_SELECTOR,
  STATUS_CHANGE_CAPACITY_SELECTOR,
  OWNER_CHANGE_CAPACITY_SELECTOR,
} from './capacity/index.js';
import { omniChannelSettingsSchema } from '../omni-channel-settings/index.js';
import { serviceChannelsSchema } from './index.js';

export const useCases = defineUseCases(serviceChannelsSchema, [
  {
    slug: '01-case-capacity-by-status',
    title: 'Case capacity follows the status of the case',
    given: [{ serviceChannelDeveloperName: 'CaseTest', capacity: { capacityModel: 'TabBased' } }],
    config: [
      {
        serviceChannelDeveloperName: 'CaseTest',
        capacity: {
          capacityModel: 'StatusBased',
          statusField: 'Case.Status',
          valuesForInProgress: ['New', 'Working', 'Escalated'],
          checkAgentCapacityOnReopenedWorkItems: true,
          checkAgentCapacityOnReassignedWorkItems: true,
        },
      },
    ],
    story: [
      'Litware turned on the status-based capacity model in `omniChannelSettings`. Its case channel still uses the tab-based **capacity model (1)**, so the change has no effect yet: each case channel must say which field tells the status of the work and which of its values mean "in progress".',
      "This config switches the channel to status-based capacity on the **Status field (2)** of the case, counts `New`, `Working` and `Escalated` cases as **in progress (3)**, and checks the agent's capacity again when a closed case is **reopened (4)** or a case is **reassigned (5)**. The `ServiceChannel` metadata of the API versions most projects deploy with has no capacity fields, so the deployment of the channel is followed by this config.",
    ],
    withoutPill: {
      '[0].serviceChannelDeveloperName': 'the service channel whose edit page is opened',
    },
    captures: {
      'service-channel': {
        clip: { x: 240, y: 722, width: 1180, height: 348 },
        pills: { '[0].capacity.valuesForInProgress': { px: 18.2, py: 39.7 } },
      },
    },
    async prepare(doc) {
      // the capacity of the channel needs the status-based capacity model of Omni-Channel
      await doc.apply(omniChannelSettingsSchema, { enableStatusBasedCapacityModel: true });
    },
    async shoot(doc) {
      const serviceChannelId = await doc.recordId("SELECT Id FROM ServiceChannel WHERE DeveloperName = 'CaseTest'");
      await using page = await doc.open(`/${serviceChannelId}/e`, { height: 1100 });
      const ui = await doc.within(page, '.bPageTitle');
      await doc.shot('service-channel', page, {
        context: [ui.locator('.bPageTitle'), ui.locator('.bPageBlock')],
        pills: {
          '[0].capacity.capacityModel': ui.locator(CAPACITY_MODEL_SELECTOR),
          '[0].capacity.statusField': {
            locator: ui.locator(STATUS_FIELD_SELECTOR),
            in: 'after',
          },
          '[0].capacity.valuesForInProgress': { locator: ui.locator('#inProgressList'), in: 'after' },
          '[0].capacity.checkAgentCapacityOnReopenedWorkItems': {
            locator: ui.locator(STATUS_CHANGE_CAPACITY_SELECTOR),
            in: 'after',
          },
          '[0].capacity.checkAgentCapacityOnReassignedWorkItems': {
            locator: ui.locator(OWNER_CHANGE_CAPACITY_SELECTOR),
            in: 'after',
          },
        },
      });
    },
  },
]);
