import { z } from 'zod';
import { schema as fieldDependenciesSchema } from './field-dependencies/schema.js';

export const picklistActionSchema = z
  .object({
    metadataType: z.enum(['CustomField', 'GlobalValueSet', 'StandardValueSet']).meta({
      description: 'the metadata type',
    }),
    metadataFullName: z
      .string()
      .meta({ description: 'the API name of the CustomField/GlobalValueSet/StandardValueSet' }),
    value: z.string().meta({ description: 'the API name of the value' }).optional(),
    newValue: z.string().meta({ description: 'the API name of the new value, otherwise blank' }).optional(),
    statusCategory: z.string().meta({ description: 'the Status Category of a new picklist value' }).optional(),
    replaceAllBlankValues: z
      .boolean()
      .meta({ description: 'replace all blank values (mutually exclusive to replacing an old value)' })
      .optional(),
    active: z.boolean().meta({ description: 'ensure the picklist value is active/inactive' }).optional(),
    absent: z.boolean().meta({ description: 'ensure the picklist value is absent/deleted' }).optional(),
  })
  .meta({ id: 'picklistAction' });

export const schema = z
  .object({
    picklistValues: z.array(picklistActionSchema).default([]).meta({
      title: 'Picklist Values',
      description: 'Replace (and delete) picklist values',
    }),
    fieldDependencies: fieldDependenciesSchema.optional(),
  })
  .meta({ id: 'picklists', title: 'Picklists' });
