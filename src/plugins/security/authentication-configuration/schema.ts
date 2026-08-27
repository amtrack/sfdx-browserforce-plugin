import { z } from 'zod';

const serviceSchema = z
  .object({
    label: z.string().meta({ description: 'The visible name of the authentication service' }).optional(),
    authProviderApiName: z
      .string()
      .meta({ description: 'The DeveloperName of the AuthProvider (alternative to label for matching)' })
      .optional(),
    enabled: z.boolean().meta({ description: 'True to enable, false to disable' }).optional(),
  })
  .meta({
    oneOf: [
      { required: ['label', 'enabled'] },
      { required: ['authProviderApiName', 'enabled'] },
      { required: ['label', 'authProviderApiName', 'enabled'] },
    ],
  });

export const schema = z
  .object({
    services: z.array(serviceSchema).meta({
      description: 'List of Authentication Services to configure under My Domain, each with desired enabled state',
      default: [],
    }),
  })
  .meta({ id: 'authenticationConfiguration', title: 'Authentication Configuration' });
