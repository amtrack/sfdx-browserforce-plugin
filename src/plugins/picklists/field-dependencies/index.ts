import { z } from 'zod';
import { ensureArray } from '../../../jsforce-utils.js';
import { BrowserforcePlugin } from '../../../plugin.js';
import { FieldDependencyPage, NewFieldDependencyPage } from './pages.js';

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

export const fieldDependenciesSchema = z.array(fieldDependencySchema).default([]).meta({
  id: 'fieldDependencies',
  title: 'Field Dependencies',
  description:
    'Manage (create/modify/delete) Field Dependencies on CustomFields.\nIf a Field Dependency already exists for the dependent field, it will be deleted.',
});

export type FieldDependencyConfig = z.infer<typeof fieldDependencySchema>;

export type FieldDependenciesConfig = z.infer<typeof fieldDependenciesSchema>;

export class FieldDependencies extends BrowserforcePlugin {
  public async retrieve(definition: FieldDependenciesConfig): Promise<FieldDependenciesConfig> {
    const dependentFieldNames = definition.map((f) => `${f.object}.${f.dependentField}`);
    const result = await this.browserforce.connection.metadata.read('CustomField', dependentFieldNames);
    const metadata = ensureArray(result);
    const state = definition.map((f) => {
      const fieldState = { ...f };
      const field = metadata.find((m) => m.fullName === `${f.object}.${f.dependentField}`);
      // for diffing: to unset a field dependency, set it to null
      fieldState.controllingField = field?.valueSet?.controllingField ?? null;
      return fieldState;
    });
    return state;
  }

  public async apply(plan: FieldDependenciesConfig): Promise<void> {
    const listMetadataResult = await this.browserforce.connection.metadata.list([
      {
        type: 'CustomObject',
      },
      { type: 'CustomField' },
    ]);
    const fileProperties = ensureArray(listMetadataResult);
    for (const dep of plan) {
      await this.browserforce.retry(async () => {
        const customObject = fileProperties.find((x) => x.type === 'CustomObject' && x.fullName === dep.object);
        if (!customObject) {
          throw new Error(`Could not find CustomObject "${dep.object}"`);
        }
        const dependentField = fileProperties.find(
          (x) => x.type === 'CustomField' && x.fullName === `${dep.object}.${dep.dependentField}`,
        );
        if (!dependentField) {
          throw new Error(`Could not find dependent field "${dep.object}.${dep.dependentField}"`);
        }
        // always try deleting an existing dependency first
        {
          await using page = await this.browserforce.openPage(FieldDependencyPage.getUrl(customObject.id));
          const fieldDependenciesPage = new FieldDependencyPage(page);
          await fieldDependenciesPage.clickDeleteDependencyActionForField(dependentField.id);
        }
        if (dep.controllingField) {
          const controllingField = fileProperties.find(
            (x) => x.type === 'CustomField' && x.fullName === `${dep.object}.${dep.controllingField}`,
          );
          if (!controllingField) {
            throw new Error(`Could not find controlling field "${dep.object}.${dep.controllingField}"`);
          }
          {
            await using page = await this.browserforce.openPage(
              NewFieldDependencyPage.getUrl(customObject.id, dependentField.id, controllingField.id),
            );
            const newFieldDependencyPage = new NewFieldDependencyPage(page);
            await newFieldDependencyPage.save();
          }
        }
      });
    }
  }
}
