import { FileProperties } from 'jsforce';
import { ensureArray } from '../../jsforce-utils';
import { BrowserforcePlugin } from '../../plugin';
import { removeEmptyValues } from '../utils';
import FieldDependencies from './field-dependencies';
import {
  PicklistPage,
  DefaultPicklistAddPage,
  StatusPicklistAddPage
} from './pages';
import { determineStandardValueSetEditUrl } from './standard-value-set';

export default class Picklists extends BrowserforcePlugin {
  public async retrieve(definition?) {
    const conn = this.org.getConnection();
    const result = { picklistValues: [], fieldDependencies: [] };
    if (definition.picklistValues) {
      const fileProperties = await listMetadata(
        conn,
        definition.picklistValues.map(x => x.metadataType)
      );
      for (const action of definition.picklistValues) {
        // check if given picklist values exist
        const picklistUrl = getPicklistUrl(
          action.metadataType,
          action.metadataFullName,
          fileProperties
        );
        const page = await this.browserforce.openPage(picklistUrl);
        const picklistPage = new PicklistPage(page);
        const values = await picklistPage.getPicklistValues();
        const state = { ...action };
        const valueMatch =
          action.value !== undefined
            ? values.find(x => x.value === action.value)
            : undefined;
        const newValueMatch =
          action.newValue !== undefined
            ? values.find(x => x.value === action.newValue)
            : undefined;
        state.absent = !valueMatch;
        state.active = valueMatch?.active;
        state.newValueExists =
          Boolean(newValueMatch) || action.newValue === null;
        result.picklistValues.push(state);
      }
    }
    if (definition.fieldDependencies) {
      result.fieldDependencies = await new FieldDependencies(
        this.browserforce,
        this.org
      ).retrieve(definition.fieldDependencies);
    }
    return result;
  }

  public diff(state, definition) {
    const changes = {};
    if (definition.picklistValues) {
      changes['picklistValues'] = definition.picklistValues.filter(
        (target, i) => {
          const source = state.picklistValues[i];
          if (target.absent) {
            return target.absent !== source.absent;
          }
          if (target.active !== undefined) {
            return target.active !== source.active;
          }
          // replacing a picklist value is not idempotent
          if (
            source.newValueExists &&
            (target.value !== undefined || target.replaceAllBlankValues)
          ) {
            return true;
          }
          if (target.newValue && !source.newValueExists) {
            // New value doesn't exist in org yet
            return true;
          }
          return false;
        }
      );
    }
    if (definition.fieldDependencies) {
      changes['fieldDependencies'] = new FieldDependencies(
        this.browserforce,
        this.org
      ).diff(state.fieldDependencies, definition.fieldDependencies);
    }
    return removeEmptyValues(changes);
  }

  public async apply(config) {
    const conn = this.org.getConnection();
    if (config.picklistValues) {
      const fileProperties = await listMetadata(
        conn,
        config.picklistValues.map(x => x.metadataType)
      );
      for (const action of config.picklistValues) {
        const picklistUrl = getPicklistUrl(
          action.metadataType,
          action.metadataFullName,
          fileProperties
        );
        const page = await this.browserforce.openPage(picklistUrl);
        const picklistPage = new PicklistPage(page);
        if (action.active !== undefined) {
          await picklistPage.clickActivateDeactivateActionForValue(
            action.value,
            action.active
          );
        } else if (action.absent) {
          const replacePage = await picklistPage.clickDeleteActionForValue(
            action.value
          );
          await replacePage.replaceAndDelete(action.newValue);
        } else if (
          !action.value &&
          action.newValue &&
          !action.replaceAllBlankValues
        ) {
          await picklistPage.clickNewActionButton();

          if (action.statusCategory) {
            await new StatusPicklistAddPage(page).add(
              action.newValue,
              action.statusCategory
            );
          } else {
            await new DefaultPicklistAddPage(page).add(action.newValue);
          }
        } else {
          const replacePage = await picklistPage.clickReplaceActionButton();
          await replacePage.replace(
            action.value,
            action.newValue,
            action.replaceAllBlankValues
          );
        }
      }
    }
    if (config.fieldDependencies) {
      await new FieldDependencies(this.browserforce, this.org).apply(
        config.fieldDependencies
      );
    }
  }
}

function getPicklistUrl(
  type: string,
  fullName: string,
  fileProperties?: Array<FileProperties>
) {
  let picklistUrl;
  if (type === 'StandardValueSet') {
    picklistUrl = determineStandardValueSetEditUrl(fullName);
  } else {
    const fileProperty = fileProperties.find(
      x => x.type === type && x.fullName === fullName
    );
    picklistUrl = `${fileProperty.id}`;
  }
  return picklistUrl;
}

async function listMetadata(conn, sobjectTypes) {
  let uniqueSobjectTypes = [...new Set<string>(sobjectTypes)];
  // don't list StandardValueSet as the FileProperties are broken
  uniqueSobjectTypes = uniqueSobjectTypes.filter(x => x !== 'StandardValueSet');
  const queries = uniqueSobjectTypes.map(type => {
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
