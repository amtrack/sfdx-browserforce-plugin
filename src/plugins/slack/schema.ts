import { z } from 'zod';

export const schema = z
  .object({
    agreeToTermsAndConditions: z
      .boolean()
      .meta({
        title: 'Agree to Termns and Conditions',
        description: 'Once the terms have been accepted, this cannot be reverted.',
      })
      .optional(),
    enableSalesCloudForSlack: z.boolean().meta({ title: "Enable the 'Sales Cloud for Slack' Slack App" }).optional(),
  })
  .meta({ id: 'slack', title: 'Slack Apps Setup' });
