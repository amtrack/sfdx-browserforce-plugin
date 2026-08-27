import { z } from 'zod';

export const fieldHistorySchema = z
  .object({
    fieldApiName: z.string().meta({
      title: 'Field API Name',
      description: 'The API name of the field to manage history tracking for.',
    }),
    enableHistoryTracking: z.boolean().meta({
      title: 'Enable History Tracking',
      description: 'If history tracking should be enabled.',
    }),
  })
  .meta({ id: 'fieldHistory' });

export const historyTrackingSchema = z
  .object({
    objectApiName: z.string().meta({
      title: 'Object API Name',
      description: 'The API name of the object to manage history tracking for.',
    }),
    enableHistoryTracking: z
      .boolean()
      .meta({
        title: 'Enable History Tracking',
        description: 'If history tracking should be enabled.',
      })
      .optional(),
    fieldHistoryTracking: z.array(fieldHistorySchema).default([]).meta({ title: 'Field History Tracking' }).optional(),
  })
  .meta({ id: 'historyTracking' });

export const schema = z.array(historyTrackingSchema).default([]).meta({
  title: 'History Tracking',
  description:
    'This feature specifically closes a gap where you cannot enable field history tracking for custom Person Account fields via the Metadata API.',
});
