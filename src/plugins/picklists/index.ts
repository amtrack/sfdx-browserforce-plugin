import type { FileProperties } from 'jsforce/api/metadata';
import { retry } from '../../browserforce';
import { ensureArray } from '../../jsforce-utils';
import { BrowserforcePlugin } from '../../plugin';
import { FieldDependencies, Config as FieldDependenciesConfig } from './field-dependencies';
import { DefaultPicklistAddPage, PicklistPage, StatusPicklistAddPage } from './pages';
import { determineStandardValueSetEditUrl } from './standard-value-set';

type Config = {
  picklistValues?: PicklistValuesConfig[];
  fieldDependencies?: FieldDependenciesConfig;
};

type PicklistValuesConfig = {
  metadataType: string;
  metadataFullName: string;
  value?: string;
  newValue?: string;
  statusCategory?: string;
  replaceAllBlankValues?: boolean;
  active?: boolean;
  absent?: boolean;
  _newValueExists?: boolean;
};

export class Picklists extends BrowserforcePlugin {
  public async retrieve(definition: Config): Promise<Config> {
    const conn = this.org.getConnection();
    const result: Config = { picklistValues: [], fieldDependencies: [] };
    if (definition.picklistValues) {
      const fileProperties = await listMetadata(
        conn,
        definition.picklistValues.map((x) => x.metadataType)
      );
      for (const action of definition.picklistValues) {
        // check if given picklist values exist
        const picklistUrl = getPicklistUrl(action.metadataType, action.metadataFullName, fileProperties);
        const page = await this.browserforce.openPage(picklistUrl);
        const picklistPage = new PicklistPage(page);
        const values = await picklistPage.getPicklistValues();
        const state = { ...action };
        const valueMatch = action.value !== undefined ? values.find((x) => x.value === action.value) : undefined;
        const newValueMatch =
          action.newValue !== undefined ? values.find((x) => x.value === action.newValue) : undefined;
        state.absent = !valueMatch;
        state.active = valueMatch?.active;
        state._newValueExists = Boolean(newValueMatch) || action.newValue === null;
        result.picklistValues!.push(state);
        await page.close();
      }
    }
    if (definition.fieldDependencies) {
      const deps = await new FieldDependencies(this.browserforce).retrieve(definition.fieldDependencies);
      result.fieldDependencies!.push(...deps);
    }
    return result;
  }

  public diff(state: Config, definition: Config): Config | undefined {
    const changes: Config = {};
    if (definition.picklistValues) {
      const picklistValues = definition.picklistValues.filter((target, i) => {
        const source = state.picklistValues?.[i];
        if (target.absent) {
          return target.absent !== source?.absent;
        }
        if (target.active !== undefined) {
          return target.active !== source?.active;
        }
        // replacing a picklist value is not idempotent
        if (source?._newValueExists && (target.value !== undefined || target.replaceAllBlankValues)) {
          return true;
        }
        if (target.newValue && !source?._newValueExists) {
          // New value doesn't exist in org yet
          return true;
        }
        return false;
      });
      if (picklistValues.length) {
        changes.picklistValues = picklistValues;
      }
    }
    if (definition.fieldDependencies) {
      const fieldDependencies = new FieldDependencies(this.browserforce).diff(
        state.fieldDependencies,
        definition.fieldDependencies
      ) as FieldDependenciesConfig;
      if (fieldDependencies !== undefined) {
        changes.fieldDependencies = fieldDependencies;
      }
    }
    return Object.keys(changes).length ? changes : undefined;
  }

  public async apply(config: Config): Promise<void> {
    const conn = this.org.getConnection();
    if (config.picklistValues) {
      const fileProperties = await listMetadata(
        conn,
        config.picklistValues.map((x) => x.metadataType)
      );
      for (const action of config.picklistValues) {
        await retry(async () => {
          const picklistUrl = getPicklistUrl(action.metadataType, action.metadataFullName, fileProperties);
          const page = await this.browserforce.openPage(picklistUrl);
          const picklistPage = new PicklistPage(page);
          if (action.active !== undefined && action.value !== undefined) {
            // activate/deactivate
            await picklistPage.clickActivateDeactivateActionForValue(action.value, action.active);
          } else if (action.absent && action.value !== undefined) {
            // delete
            const replacePage = await picklistPage.clickDeleteActionForValue(action.value);
            await replacePage.replaceAndDelete(action.newValue);
            await replacePage.save();
          } else if (
            action.value === undefined &&
            action.newValue !== undefined &&
            action.replaceAllBlankValues === undefined
          ) {
            // create
            await picklistPage.clickNewActionButton();
            if (action.statusCategory) {
              await new StatusPicklistAddPage(page).add(action.newValue, action.statusCategory);
            } else {
              await new DefaultPicklistAddPage(page).add(action.newValue);
            }
          } else if (action.value !== undefined && action.newValue !== undefined) {
            // replace
            const replacePage = await picklistPage.clickReplaceActionButton();
            await replacePage.replace(action.value, action.newValue, action.replaceAllBlankValues);
          } else {
            throw new Error(`Could not determine action for input: ${JSON.stringify(action)}`);
          }
          await page.close();
        });
      }
    }
    if (config.fieldDependencies) {
      await new FieldDependencies(this.browserforce).apply(config.fieldDependencies);
    }
  }
}

function getPicklistUrl(type: string, fullName: string, fileProperties?: FileProperties[]): string {
  let picklistUrl;
  if (type === 'StandardValueSet') {
    picklistUrl = determineStandardValueSetEditUrl(fullName);
  } else {
    const fileProperty = fileProperties?.find((x) => x.type === type && x.fullName === fullName);
    if (fileProperty) {
      picklistUrl = `${fileProperty.id}`;
    }
  }
  return picklistUrl;
}

async function listMetadata(conn, sobjectTypes): Promise<FileProperties[]> {
  let uniqueSobjectTypes = [...new Set<string>(sobjectTypes)];
  // don't list StandardValueSet as the FileProperties are broken
  uniqueSobjectTypes = uniqueSobjectTypes.filter((x) => x !== 'StandardValueSet');
  const queries = uniqueSobjectTypes.map((type) => {
    return {
      type
    };
  });
  if (queries.length) {
    const fileProperties = await conn.metadata.list(queries);
    return ensureArray(fileProperties);
  } else {
    return [];
  }
}
