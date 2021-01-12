import { FileProperties } from 'jsforce';
import { ensureArray } from '../../jsforce-utils';
import { BrowserforcePlugin } from '../../plugin';
import { PicklistPage } from './pages';
import { determineStandardValueSetEditUrl } from './standard-value-set';

export default class Picklists extends BrowserforcePlugin {
  public async retrieve(definition?) {
    const conn = this.org.getConnection();
    const result = { picklistValues: [] };
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
      state.newValueExists = Boolean(newValueMatch) || action.newValue === null;
      result.picklistValues.push(state);
    }
    return result;
  }

  public diff(state, definition) {
    const actions = definition.picklistValues.filter((target, i) => {
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
      return false;
    });
    if (actions.length) {
      return { picklistValues: actions };
    }
    return undefined;
  }

  public async apply(config) {
    const conn = this.org.getConnection();
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
