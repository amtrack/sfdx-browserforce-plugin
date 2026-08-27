import { z } from 'zod';

export const schema = z
  .object({
    enableStatusBasedCapacityModel: z
      .boolean()
      .meta({
        title: 'Enable Status-Based Capacity Model',
        description: 'Route and track work based on changes to work status and ownership.',
      })
      .optional(),
  })
  .meta({ id: 'omniChannelSettings', title: 'Omni-Channel Settings' });
