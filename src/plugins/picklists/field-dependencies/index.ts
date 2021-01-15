import { BrowserforcePlugin } from '../../../plugin';
import { FieldDependencyPage, NewFieldDependencyPage } from './pages';

export default class FieldDependencies extends BrowserforcePlugin {
  public async retrieve(definition?) {
    const conn = this.org.getConnection();
    const dependentFieldNames = definition.map(
      f => `${f.object}.${f.dependentField}`
    );
    const result = await conn.metadata.read('CustomField', dependentFieldNames);
    const metadata = Array.isArray(result) ? result : [result];
    const state = definition.map(f => {
      const fieldState = { ...f };
      const field = metadata.find(
        m => m.fullName === `${f.object}.${f.dependentField}`
      );
      fieldState.controllingField = field?.['valueSet']?.controllingField;
      return fieldState;
    });
    return state;
  }

  public async apply(plan) {
    const conn = this.org.getConnection();
    const listMetadataResult = await conn.metadata.list([
      {
        type: 'CustomObject'
      },
      { type: 'CustomField' }
    ]);
    const fileProperties = Array.isArray(listMetadataResult)
      ? listMetadataResult
      : [listMetadataResult];
    for (const dep of plan) {
      const customObject = fileProperties.find(
        x => x.type === 'CustomObject' && x.fullName === dep.object
      );
      const dependentField = fileProperties.find(
        x =>
          x.type === 'CustomField' &&
          x.fullName === `${dep.object}.${dep.dependentField}`
      );
      // always try deleting an existing dependency first
      const fieldDependenciesPage = new FieldDependencyPage(
        await this.browserforce.openPage(
          FieldDependencyPage.getUrl(customObject.id)
        )
      );
      await fieldDependenciesPage.clickDeleteDependencyActionForField(
        dependentField.id
      );
      if (dep.controllingField) {
        const controllingField = fileProperties.find(
          x =>
            x.type === 'CustomField' &&
            x.fullName === `${dep.object}.${dep.controllingField}`
        );
        const newFieldDependencyPage = new NewFieldDependencyPage(
          await this.browserforce.openPage(
            NewFieldDependencyPage.getUrl(
              customObject.id,
              dependentField.id,
              controllingField.id
            )
          )
        );
        await newFieldDependencyPage.save();
      }
    }
  }
}
