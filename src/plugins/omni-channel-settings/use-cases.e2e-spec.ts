import { defineUseCases } from '../../../scripts/use-cases.js';
import { omniChannelSettingsSchema, STATUS_CAPACITY_TOGGLE_SELECTOR } from './index.js';

export const useCases = defineUseCases(omniChannelSettingsSchema, [
  {
    slug: '01-route-cases-by-status',
    title: 'A support center counts only the cases agents are working on',
    given: { enableStatusBasedCapacityModel: false },
    config: { enableStatusBasedCapacityModel: true },
    // the use cases of serviceChannels and permissionSets need the status-based model
    restore: false,
    story: [
      'The support center of Litware routes cases to its agents with Omni-Channel. With the default tab-based capacity model, a case counts against an agent\'s capacity as long as its tab is open, so agents who park cases in "Waiting on customer" stop receiving new work while they have nothing to do.',
      'The **status-based capacity model (1)** counts a case only while its status says it is in progress, and frees the capacity as soon as the agent changes the status or the owner. It is a checkbox of the Omni-Channel Settings page with no Metadata API equivalent; turn it on with this config before configuring the capacity of the service channels with `serviceChannels`.',
    ],
    async shoot(doc) {
      await using page = await doc.open('/omnichannel/settings.apexp');
      const ui = await doc.within(page, '.bPageTitle');
      await doc.shot('omni-channel-settings', page, {
        context: [ui.locator('.bPageTitle'), ui.locator('.bPageBlock')],
        pills: { enableStatusBasedCapacityModel: ui.locator(STATUS_CAPACITY_TOGGLE_SELECTOR) },
      });
    },
  },
]);
