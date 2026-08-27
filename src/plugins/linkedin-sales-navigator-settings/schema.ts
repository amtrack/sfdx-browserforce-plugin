import { z } from 'zod';

export const schema = z
  .object({
    enabled: z.boolean().meta({ title: 'Enable LinkedIn Sales Navigator Integration' }).optional(),
  })
  .meta({ id: 'linkedInSalesNavigatorSettings', title: 'LinkedIn Sales Navigator Settings' });
