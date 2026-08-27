import { z } from 'zod';

export const schema = z
  .object({
    accessLevel: z
      .enum(['No access', 'System email only', 'All email'])
      .meta({ title: 'Access Level', description: 'Choose the email Deliverability Access Level required' })
      .optional(),
  })
  .meta({ id: 'emailDeliverability', title: 'Email Deliverability Settings' });
