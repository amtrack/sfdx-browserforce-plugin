import { z } from 'zod';

export const schema = z
  .object({
    enabled: z
      .boolean()
      .meta({ title: 'Enable Salesforce to Salesforce', description: 'Warning: cannot be disabled once enabled' })
      .optional(),
  })
  .meta({ id: 'salesforceToSalesforce', title: 'Salesforce to Salesforce Settings' });
