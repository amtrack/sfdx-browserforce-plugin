import { defineUseCases } from '../../../scripts/use-cases.js';
import { VALUES_ENABLED_SELECTOR } from './service-presence-status/index.js';
import { omniChannelSettingsSchema } from '../omni-channel-settings/index.js';
import { permissionSetsSchema } from './index.js';

export const useCases = defineUseCases(permissionSetsSchema, [
  {
    slug: '01-agents-presence-statuses',
    title: 'Support agents get the presence statuses of their team',
    given: [{ permissionSetName: 'ServicePresenceTest', servicePresenceStatuses: [] }],
    config: [{ permissionSetName: 'ServicePresenceTest', servicePresenceStatuses: ['TestStatus', 'TestStatus2'] }],
    story: [
      'Omni-Channel agents choose a presence status, such as "Available for cases" or "On a break", in the Omni-Channel widget, and they only see the statuses their profile or permission sets give access to. Litware gives them through the **permission set (1)** of its support agents, and adds a status each time a new channel opens.',
      'The access of a permission set to service presence statuses is not part of the `PermissionSet` metadata. This config moves the statuses `TestStatus` and `TestStatus2` (the API names of the statuses, here those of the test fixtures of this plugin) to the **enabled statuses (2)** of the permission set, and removes the ones not listed.',
    ],
    captures: {
      'presence-statuses': {
        clip: { x: 236, y: 106, width: 1184, height: 600 },
      },
    },
    async prepare(doc) {
      // the presence statuses of the agents need the status-based capacity model of Omni-Channel
      await doc.apply(omniChannelSettingsSchema, { enableStatusBasedCapacityModel: true });
    },
    async shoot(doc) {
      const permissionSetId = await doc.recordId("SELECT Id FROM PermissionSet WHERE Name = 'ServicePresenceTest'");
      await using page = await doc.open(`/${permissionSetId}/e?s=ServicePresenceStatusAccess`);
      const ui = await doc.within(page, '.bPageTitle h2');
      await doc.shot('presence-statuses', page, {
        pills: {
          '[0].permissionSetName': ui.locator('.bPageTitle h2'),
          '[0].servicePresenceStatuses': ui.locator(VALUES_ENABLED_SELECTOR),
        },
      });
    },
  },
]);
