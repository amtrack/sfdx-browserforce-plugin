import { z } from 'zod';
import { schema as authenticationConfigurationSchema } from './authentication-configuration/schema.js';
import { schema as certificateAndKeyManagementSchema } from './certificate-and-key-management/schema.js';

export const schema = z
  .object({
    certificateAndKeyManagement: certificateAndKeyManagementSchema.optional(),
    authenticationConfiguration: authenticationConfigurationSchema.optional(),
  })
  .meta({ id: 'security', title: 'Security Controls' });
