import { z } from 'zod';

export const schema = z
  .object({
    allowUsersToRelateMultipleContactsToTasksAndEvents: z
      .boolean()
      .meta({
        title: 'Allow Users to Relate Multiple Contacts to Tasks and Events',
        description:
          'Although the Metadata API has a ActivitiesSettings.allowUsersToRelateMultipleContactsToTasksAndEvents field, it is not possible to enable this setting using an API. Warning: can only be disabled with help of the salesforce.com Support team. https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_activitiessettings.htm',
      })
      .optional(),
  })
  .meta({ id: 'activitySettings', title: 'Activity Settings' });
