import { z } from 'zod';

export const schema = z
  .object({
    enabled: z
      .boolean()
      .meta({
        title: 'Enable RelateContactToMultipleAccounts',
        description:
          "This allows you to enable the 'Relate contact to multiple Accounts' in the Account settings. Doing this through the metadata API will not always make the AccountContactRelation object available. Enabling the feature using the setup does always work, therefore this plugin.",
      })
      .optional(),
  })
  .meta({ id: 'relateContactToMultipleAccounts', title: 'RelateContactToMultipleAccounts Settings' });
