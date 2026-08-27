import { z } from 'zod';

export const accessPolicySchema = z
  .object({
    apiName: z.string().meta({ description: "The API name of the user access policy (e.g., 'Grant_Permissions')" }),
    active: z.boolean().meta({ description: 'Whether the policy should be active (true) or inactive (false)' }),
    on: z
      .enum(['Create', 'Update', 'CreateAndUpdate'])
      .meta({
        description: "Optional: specify when to apply the policy - 'Create', 'Update', or 'CreateAndUpdate'",
      })
      .optional(),
  })
  .meta({ id: 'accessPolicy' });

export const schema = z
  .object({
    accessPolicies: z.array(accessPolicySchema).default([]).meta({
      title: 'Access Policies',
      description: 'List of user access policies to activate or deactivate',
    }),
  })
  .meta({ id: 'userAccessPolicies', title: 'User Access Policies' });
