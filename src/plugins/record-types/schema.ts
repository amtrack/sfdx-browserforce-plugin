import { z } from 'zod';

export const recordTypeActionSchema = z
  .object({
    fullName: z.string().meta({ description: 'the API name of the RecordType' }),
    replacement: z.string().meta({ description: 'optional API name of the replacement RecordType' }).optional(),
  })
  .meta({ id: 'recordTypeAction' });

export const schema = z
  .object({
    deletions: z.array(recordTypeActionSchema).default([]).meta({
      title: 'Record Type Deletions',
      description: 'Delete inactive record types',
    }),
  })
  .meta({ id: 'recordTypes', title: 'RecordTypes' });
