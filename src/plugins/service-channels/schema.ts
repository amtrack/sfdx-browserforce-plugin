import { z } from 'zod';
import { schema as capacitySchema } from './capacity/schema.js';

const serviceChannelSchema = z
  .object({
    serviceChannelDeveloperName: z.string().meta({
      title: 'Service Channel',
      description: 'The developer name of the Service Channel to modify',
    }),
    capacity: capacitySchema.optional(),
  })
  .meta({ id: 'serviceChannel' });

export const schema = z.array(serviceChannelSchema).default([]).meta({ title: 'Service Channels' });
