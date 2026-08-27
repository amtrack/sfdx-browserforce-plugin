import { z } from 'zod';

export const fieldDependencySchema = z
  .object({
    object: z
      .string()
      .meta({
        title: 'the API name of the CustomObject',
        examples: ['Account', 'Vehicle__c', 'ACME__Vehicle__c'],
      })
      .optional(),
    dependentField: z
      .string()
      .meta({
        title: 'the API name of the CustomField that has its values filtered',
        examples: ['Gears__c', 'ACME__Gears__c'],
      })
      .optional(),
    controllingField: z
      .string()
      .nullable()
      .optional()
      .meta({
        title: 'the API name of the CustomField that drives filtering',
        description: 'If this value is null or not set, the Field Dependency will be deleted.',
        examples: ['Transmission__c', 'ACME__Transmission__c', null],
      }),
  })
  .meta({ id: 'fieldDependency' });

export const schema = z.array(fieldDependencySchema).default([]).meta({
  id: 'fieldDependencies',
  title: 'Field Dependencies',
  description:
    'Manage (create/modify/delete) Field Dependencies on CustomFields.\nIf a Field Dependency already exists for the dependent field, it will be deleted.',
});
