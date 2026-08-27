import { z } from 'zod';
import { schema as servicePresenceStatusesSchema } from './service-presence-status/schema.js';

const permissionSetSchema = z
  .object({
    permissionSetName: z.string().meta({
      title: 'Permission Set',
      description: 'The name of the Permission Set to modify',
    }),
    servicePresenceStatuses: servicePresenceStatusesSchema.optional(),
  })
  .meta({ id: 'permissionSet' });

export const schema = z.array(permissionSetSchema).default([]).meta({ title: 'Permission Sets' });
