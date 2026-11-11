import type { FileProperties } from '@jsforce/jsforce-node/lib/api/metadata.js';
import { z } from 'zod';
import { type SalesforceUrlPath } from '../../browserforce.js';
import { ensureArray } from '../../jsforce-utils.js';
import { BrowserforcePlugin } from '../../plugin.js';
import { FieldDependencies, FieldDependenciesConfig, fieldDependenciesSchema } from './field-dependencies/index.js';
import { PicklistPage, type PicklistValue } from './pages/picklist.js';
import { StatusPicklistAddPage } from './pages/picklist-status.js';
import { DefaultPicklistAddPage } from './pages/default-picklist-add.js';
import { determineStandardValueSetEditUrl } from './standard-value-set.js';

const picklistActionSchema = z
  .object({
    metadataType: z.enum(['CustomField', 'GlobalValueSet', 'StandardValueSet']).describe('the metadata type'),
    metadataFullName: z.string().describe('the API name of the CustomField/GlobalValueSet/StandardValueSet'),
    value: z.string().describe('the API name of the value').optional(),
    newValue: z.string().describe('the API name of the new value, otherwise blank').optional(),
    statusCategory: z.string().describe('the Status Category of a new picklist value').optional(),
    replaceAllBlankValues: z
      .boolean()
      .describe('replace all blank values (mutually exclusive to replacing an old value)')
      .optional(),
    active: z.boolean().describe('ensure the picklist value is active/inactive').optional(),
    absent: z.boolean().describe('ensure the picklist value is absent/deleted').optional(),
    newApiName: z
      .string()
      .min(1)
      .describe('rename the API name of the value: the records holding it follow')
      .optional(),
    newLabel: z.string().min(1).describe('with newApiName: the new label of the renamed value').optional(),
  })
  .superRefine((action, ctx) => {
    if (action.newLabel !== undefined && action.newApiName === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['newLabel'],
        message: 'newLabel only goes with newApiName: deploy the label of a value with the Metadata API',
      });
    }
    if (action.newApiName === undefined) {
      return;
    }
    if (action.value === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'newApiName needs the API name of the value to rename',
      });
    } else if (action.newApiName === action.value) {
      ctx.addIssue({ code: 'custom', path: ['newApiName'], message: 'newApiName must differ from value' });
    }
    for (const key of ['newValue', 'statusCategory', 'replaceAllBlankValues', 'active', 'absent'] as const) {
      if (action[key] !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `newApiName renames a value and cannot be combined with ${key}: use another action`,
        });
      }
    }
  })
  .meta({ id: 'picklistAction' });

export const picklistsSchema = z
  .object({
    picklistValues: z
      .array(picklistActionSchema)
      .default([])
      .meta({
        title: 'Picklist Values',
      })
      .describe('Replace (and delete) picklist values'),
    fieldDependencies: fieldDependenciesSchema.optional(),
  })
  .meta({
    id: 'picklists',
    title: 'Picklists',
    description: [
      'Changes picklist values in ways the Metadata API cannot:',
      '',
      '- replace a value by another one in the records using it, then deactivate or delete the old value;',
      '- activate or deactivate values;',
      '- rename the API name of a value (`newApiName`, and its label with `newLabel`), active or inactive: Salesforce updates the records holding it, without field history nor automation. A deployment of a renamed value creates a new value instead, so rename it in your source too. The org must allow it (`PicklistSettings.isPicklistApiNameEditDisabled` false);',
      '- manage (create, modify, delete) the field dependencies of custom fields. An existing field dependency of the dependent field is deleted first.',
    ].join('\n'),
    examples: [
      {
        picklistValues: [
          {
            metadataType: 'StandardValueSet',
            metadataFullName: 'LeadSource',
            value: 'Phone Inquiry',
            newValue: 'Other',
          },
        ],
      },
      {
        picklistValues: [
          {
            metadataType: 'StandardValueSet',
            metadataFullName: 'LeadSource',
            value: 'Purchased List',
            newValue: 'Other',
            absent: true,
          },
        ],
      },
      {
        picklistValues: [
          {
            metadataType: 'CustomField',
            metadataFullName: 'Account.MyPicklist__c',
            value: 'MyOldValue',
            active: false,
          },
        ],
      },
      {
        picklistValues: [
          {
            metadataType: 'StandardValueSet',
            metadataFullName: 'LeadSource',
            value: 'Partner Referral',
            newApiName: 'Partner_Referral',
          },
        ],
      },
    ],
  });

export type PicklistsConfig = z.infer<typeof picklistsSchema>;

export type PicklistValuesConfig = z.infer<typeof picklistActionSchema> & { _newValueId?: string };

export class Picklists extends BrowserforcePlugin {
  public async retrieve(definition: PicklistsConfig): Promise<PicklistsConfig> {
    const picklistValues: PicklistValuesConfig[] = [];
    const result: PicklistsConfig = { picklistValues, fieldDependencies: [] };
    if (definition.picklistValues) {
      const fileProperties = await listMetadata(
        this.browserforce.connection,
        definition.picklistValues.map((x) => x.metadataType),
      );
      for (const action of definition.picklistValues) {
        // check if given picklist values exist
        const picklistUrl = getPicklistUrl(action.metadataType, action.metadataFullName, fileProperties);
        await using page = await this.browserforce.openPage(picklistUrl);
        const picklistPage = new PicklistPage(page);
        const values = await picklistPage.getPicklistValues();
        if (action.newApiName !== undefined) {
          picklistValues.push(renameState(action, values));
          continue;
        }
        const state: PicklistValuesConfig = { ...action };
        const valueMatch = action.value !== undefined ? values.find((x) => x.value === action.value) : undefined;
        state.absent = !valueMatch;
        state.active = valueMatch?.active;
        state._newValueId = values.find((x) => x.value === action.newValue)?.id;
        picklistValues.push(state);
      }
    }
    if (definition.fieldDependencies) {
      const deps = await new FieldDependencies(this.browserforce).retrieve(definition.fieldDependencies);
      result.fieldDependencies!.push(...deps);
    }
    return result;
  }

  public diff(state: PicklistsConfig, definition: PicklistsConfig): Partial<PicklistsConfig> | undefined {
    const changes: Partial<PicklistsConfig> = {};
    if (definition.picklistValues) {
      const picklistValues = definition.picklistValues.filter((target, i) => {
        const source = state.picklistValues?.[i] as PicklistValuesConfig | undefined;
        if (target.newApiName !== undefined) {
          return isRenameNeeded(source, target);
        }
        if (target.absent) {
          return target.absent !== source?.absent;
        }
        if (target.active !== undefined) {
          return target.active !== source?.active;
        }
        // replacing a picklist value is not idempotent
        if (source?._newValueId && (target.value !== undefined || target.replaceAllBlankValues)) {
          return true;
        }
        if (target.newValue && !source?._newValueId) {
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
        definition.fieldDependencies,
      ) as FieldDependenciesConfig;
      if (fieldDependencies !== undefined) {
        changes.fieldDependencies = fieldDependencies;
      }
    }
    return Object.keys(changes).length ? changes : undefined;
  }

  public async apply(config: PicklistsConfig): Promise<void> {
    if (config.picklistValues) {
      const fileProperties = await listMetadata(
        this.browserforce.connection,
        config.picklistValues.map((x) => x.metadataType),
      );
      if (config.picklistValues.some((action) => action.newApiName !== undefined)) {
        await this.checkApiNamesCanChange();
      }
      for (const action of config.picklistValues) {
        if (action.newApiName !== undefined) {
          await this.rename(action, getPicklistUrl(action.metadataType, action.metadataFullName, fileProperties));
          continue;
        }
        // Error: There's another picklist operation in progress for this object. Try your change again later.
        // Error: Someone else is editing this picklist or its values. Try again later."
        await this.browserforce.retry(async () => {
          const picklistUrl = getPicklistUrl(action.metadataType, action.metadataFullName, fileProperties);
          await using page = await this.browserforce.openPage(picklistUrl);
          const picklistPage = new PicklistPage(page);
          if (action.active !== undefined && action.value !== undefined) {
            // activate/deactivate
            await picklistPage.clickActivateDeactivateActionForValue(action.value, action.active);
          } else if (action.absent && action.value !== undefined) {
            // delete
            const values = await picklistPage.getPicklistValues();
            const newValueId = values.find((picklist) => picklist.value === action.newValue)?.id;
            const replacePage = await picklistPage.clickDeleteActionForValue(action.value);
            await replacePage.replaceAndDelete(newValueId);
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
          } else if (action.newValue !== undefined && (action.value !== undefined || action.replaceAllBlankValues)) {
            // replace a value, and/or the blank values
            const values = await picklistPage.getPicklistValues();
            const newValue = values.find((picklist) => picklist.value === action.newValue);
            let newValueLabel;
            if (newValue?.label) {
              newValueLabel = newValue.label;
            }
            if (newValue?.statusCategory !== undefined) {
              newValueLabel += ` (${newValue.statusCategory})`;
            }
            const replacePage = await picklistPage.clickReplaceActionButton();
            await replacePage.replace(action.value, newValueLabel, action.replaceAllBlankValues);
          } else {
            throw new Error(`Could not determine action for input: ${JSON.stringify(action)}`);
          }
        });
      }
    }
    if (config.fieldDependencies) {
      await new FieldDependencies(this.browserforce).apply(config.fieldDependencies);
    }
  }

  private async checkApiNamesCanChange(): Promise<void> {
    const settings = (await this.browserforce.connection.metadata.read('PicklistSettings', 'Picklist')) as {
      isPicklistApiNameEditDisabled?: boolean | string;
    };
    if (String(settings?.isPicklistApiNameEditDisabled) === 'true') {
      throw new Error(
        'Changing the API names of picklist values is disabled in this org: deploy PicklistSettings with isPicklistApiNameEditDisabled set to false first',
      );
    }
  }

  /**
   * Renames the API name (and the label) of a value on its edit page. Inactive values have no Edit link: they are
   * activated first, then deactivated again under their new API name, even when the rename fails. Each step reads
   * the values of the page again, so a retry resumes from the state of the org.
   */
  private async rename(action: PicklistValuesConfig, picklistUrl: SalesforceUrlPath): Promise<void> {
    const newApiName = action.newApiName!;
    // the old API name until the rename is saved, then the new one
    const findValue = (values: PicklistValue[]): PicklistValue => {
      const match = values.find((x) => x.value === action.value) ?? values.find((x) => x.value === newApiName);
      if (!match) {
        throw new Error(`Cannot rename "${action.value}" of ${action.metadataFullName}: the value was not found`);
      }
      return match;
    };
    // set by the first attempt only: a retry after the activation must still deactivate the value at the end
    let wasInactive: boolean | undefined;
    await this.browserforce.retry(async () => {
      await using page = await this.browserforce.openPage(picklistUrl);
      const picklistPage = new PicklistPage(page);
      const value = findValue(await picklistPage.getPicklistValues());
      wasInactive ??= !value.active;
      if (!value.active) {
        await picklistPage.clickActivateDeactivateActionForValue(value.value, true);
      }
    });
    try {
      await this.browserforce.retry(async () => {
        await using page = await this.browserforce.openPage(picklistUrl);
        const picklistPage = new PicklistPage(page);
        const value = findValue(await picklistPage.getPicklistValues());
        const editPage = await picklistPage.clickEditActionForValue(value.value);
        await editPage.edit({ apiName: value.value === newApiName ? undefined : newApiName, label: action.newLabel });
      });
    } finally {
      if (wasInactive) {
        await this.browserforce.retry(async () => {
          await using page = await this.browserforce.openPage(picklistUrl);
          const picklistPage = new PicklistPage(page);
          const value = findValue(await picklistPage.getPicklistValues());
          if (value.active) {
            await picklistPage.clickActivateDeactivateActionForValue(value.value, false);
          }
        });
      }
    }
  }
}

/**
 * The state of a rename action: `value` and `newApiName` only when the org has them, `newLabel` the current label.
 */
export function renameState(action: PicklistValuesConfig, values: PicklistValue[]): PicklistValuesConfig {
  const old = values.find((x) => x.value === action.value);
  const renamed = values.find((x) => x.value === action.newApiName);
  if (old && renamed) {
    throw new Error(
      `Cannot rename "${action.value}" of ${action.metadataFullName} to "${action.newApiName}": another value has this API name`,
    );
  }
  if (!old && !renamed) {
    throw new Error(
      `Cannot rename "${action.value}" of ${action.metadataFullName}: no value has this API name nor "${action.newApiName}"`,
    );
  }
  return {
    ...action,
    value: old ? action.value : undefined,
    newApiName: renamed ? action.newApiName : undefined,
    newLabel: (renamed ?? old)!.label,
  };
}

/**
 * A rename is needed until the org has the new API name, and the new label when the config sets one.
 */
export function isRenameNeeded(source: PicklistValuesConfig | undefined, target: PicklistValuesConfig): boolean {
  if (source?.newApiName === undefined) {
    return true;
  }
  return target.newLabel !== undefined && source.newLabel !== target.newLabel;
}

function getPicklistUrl(type: string, fullName: string, fileProperties?: FileProperties[]): SalesforceUrlPath {
  let picklistUrl;
  if (type === 'StandardValueSet') {
    picklistUrl = determineStandardValueSetEditUrl(fullName);
  } else {
    const fileProperty = fileProperties?.find((x) => x.type === type && x.fullName === fullName);
    if (fileProperty) {
      picklistUrl = `/${fileProperty.id}`;
    }
  }
  return picklistUrl;
}

async function listMetadata(connection, sobjectTypes): Promise<FileProperties[]> {
  let uniqueSobjectTypes = [...new Set<string>(sobjectTypes)];
  // don't list StandardValueSet as the FileProperties are broken
  uniqueSobjectTypes = uniqueSobjectTypes.filter((x) => x !== 'StandardValueSet');
  const queries = uniqueSobjectTypes.map((type) => {
    return {
      type,
    };
  });
  if (queries.length) {
    const fileProperties = await connection.metadata.list(queries);
    return ensureArray(fileProperties);
  } else {
    return [];
  }
}
