import { z } from 'zod';
import { schemas } from './index.js';

export const rootSchema = z
  .object({
    settings: z.strictObject(Object.fromEntries(Object.entries(schemas).map(([key, s]) => [key, s.optional()]))),
  })
  .meta({
    title: 'Browserforce Configuration',
  })
  .describe(
    'The browserforce config file contains the configuration values that defines browser automation tasks for Salesforce orgs.',
  );
