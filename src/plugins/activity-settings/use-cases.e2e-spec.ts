import { defineUseCases } from '../../../scripts/use-cases.js';
import { activitySettingsSchema } from './index.js';

export const useCases = defineUseCases(activitySettingsSchema, [
  {
    slug: '01-meetings-with-several-contacts',
    title: 'Meetings are logged once for every contact who attended',
    config: { allowUsersToRelateMultipleContactsToTasksAndEvents: true },
    story: [
      'The account managers of Proseware meet buying committees of four or five people. An event can only be related to one contact, so they either log the meeting once and the other attendees show no activity, or log it five times and the activity reports count five meetings.',
      '**Allow Users to Relate Multiple Contacts to Tasks and Events (1)** turns on Shared Activities: a task or an event can name up to 50 contacts. The `ActivitiesSettings` field of the Metadata API is read-only, so the setting can only be turned on in Setup, and only Salesforce Support can turn it off again: try it in a sandbox before applying this config to production.',
    ],
    captures: {
      'activity-settings': {
        pills: { allowUsersToRelateMultipleContactsToTasksAndEvents: { px: 1.6 } },
      },
    },
    async shoot(doc) {
      await using page = await doc.open('/setup/activitiesSetupPage.apexp');
      const ui = await doc.within(page, '.bPageTitle');
      await doc.shot('activity-settings', page, {
        context: [ui.locator('.bPageTitle'), ui.locator('.bPageBlock')],
        pills: {
          allowUsersToRelateMultipleContactsToTasksAndEvents: ui.locator(
            'input[id="thePage:theForm:theBlock:manyWhoPref"]',
          ),
        },
      });
    },
  },
]);
