import { retry } from '../../../browserforce.js';
import { ensureArray } from '../../../jsforce-utils.js';
import { BrowserforcePlugin } from '../../../plugin.js';
import { FieldDependencyPage, NewFieldDependencyPage } from './pages.js';

export type FieldDependencyConfig = {
  object: string;
  dependentField: string;
  controllingField: string | null;
};

export type Config = FieldDependencyConfig[];

export class FieldDependencies extends BrowserforcePlugin {
  public async retrieve(definition: Config): Promise<Config> {
    const conn = this.org.getConnection();
    const dependentFieldNames = definition.map((f) => `${f.object}.${f.dependentField}`);
    const result = await conn.metadata.read('CustomField', dependentFieldNames);
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

  public async apply(plan: Config): Promise<void> {
    const conn = this.org.getConnection();
    const listMetadataResult = await conn.metadata.list([
      {
        type: 'CustomObject'
      },
      { type: 'CustomField' }
    ]);
    const fileProperties = ensureArray(listMetadataResult);
    for (const dep of plan) {
      await retry(async () => {
        const customObject = fileProperties.find((x) => x.type === 'CustomObject' && x.fullName === dep.object);
        if (!customObject) {
          throw new Error(`Could not find CustomObject "${dep.object}"`);
        }
        const dependentField = fileProperties.find(
          (x) => x.type === 'CustomField' && x.fullName === `${dep.object}.${dep.dependentField}`
        );
        if (!dependentField) {
          throw new Error(`Could not find dependent field "${dep.object}.${dep.dependentField}"`);
        }
        // always try deleting an existing dependency first
        const fieldDependenciesPage = new FieldDependencyPage(
          await this.browserforce.openPage(FieldDependencyPage.getUrl(customObject.id))
        );
        await fieldDependenciesPage.clickDeleteDependencyActionForField(dependentField.id);
        if (dep.controllingField) {
          const controllingField = fileProperties.find(
            (x) => x.type === 'CustomField' && x.fullName === `${dep.object}.${dep.controllingField}`
          );
          if (!controllingField) {
            throw new Error(`Could not find controlling field "${dep.object}.${dep.controllingField}"`);
          }
          const newFieldDependencyPage = new NewFieldDependencyPage(
            await this.browserforce.openPage(
              NewFieldDependencyPage.getUrl(customObject.id, dependentField.id, controllingField.id)
            )
          );
          await newFieldDependencyPage.save();
        }
      });
    }
  }
}
