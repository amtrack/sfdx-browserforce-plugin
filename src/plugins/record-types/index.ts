import { Connection } from '@salesforce/core';
import { z } from 'zod';
import { BrowserforcePlugin } from '../../plugin.js';
import { RecordTypePage } from './pages/record-type.js';

const recordTypeActionSchema = z
  .object({
    fullName: z.string().describe('the API name of the RecordType'),
    replacement: z.string().describe('optional API name of the replacement RecordType').optional(),
  })
  .meta({ id: 'recordTypeAction' });

export const recordTypesSchema = z
  .object({
    deletions: z
      .array(recordTypeActionSchema)
      .default([])
      .meta({
        title: 'Record Type Deletions',
      })
      .describe('Delete inactive record types'),
  })
  .meta({ id: 'recordTypes', title: 'RecordTypes' });

type RecordTypesConfig = z.infer<typeof recordTypesSchema>;

export class RecordTypes extends BrowserforcePlugin {
  public async retrieve(definition: RecordTypesConfig): Promise<RecordTypesConfig> {
    const response: RecordTypesConfig = {
      deletions: [],
    };
    const recordTypeFileProperties = await listRecordTypes(this.browserforce.connection);
    const recordTypes = await queryRecordTypes(this.browserforce.connection);
    for (const deletion of definition.deletions) {
      const recordType = getRecordType(deletion.fullName, recordTypeFileProperties, recordTypes);
      if (recordType) {
        if (recordType.IsActive) {
          throw new Error(`Cannot delete active RecordType: ${deletion.fullName}`);
        }
        if (deletion.replacement) {
          const replacementRecordType = getRecordType(deletion.replacement, recordTypeFileProperties, recordTypes);
          if (!replacementRecordType) {
            throw new Error(`Could not find replacement RecordType: ${deletion.replacement}`);
          }
        }
        response.deletions.push(deletion);
      }
    }
    return response;
  }

  public diff(source: RecordTypesConfig, target: RecordTypesConfig): Partial<RecordTypesConfig> | undefined {
    const changes: Partial<RecordTypesConfig> = {};
    if (target.deletions?.length && source.deletions?.length) {
      changes.deletions = source.deletions;
    }
    return Object.keys(changes).length ? changes : undefined;
  }

  public async apply(config: RecordTypesConfig): Promise<void> {
    const recordTypeFileProperties = await listRecordTypes(this.browserforce.connection);
    const recordTypes = await queryRecordTypes(this.browserforce.connection);

    for (const deletion of config.deletions) {
      const recordType = getRecordType(deletion.fullName, recordTypeFileProperties, recordTypes);
      await using page = await this.browserforce.openPage(
        `/ui/setup/rectype/RecordTypes?type=${recordType.EntityDefinitionId}`,
      );
      const recordTypePage = new RecordTypePage(page);
      const deletePage = await recordTypePage.clickDeleteAction(recordType.Id);
      let newRecordTypeId;
      if (deletion.replacement) {
        const replacementRecordType = getRecordType(deletion.replacement, recordTypeFileProperties, recordTypes);
        newRecordTypeId = replacementRecordType.Id;
      }
      await deletePage.replace(newRecordTypeId);
    }
  }
}

async function listRecordTypes(connection) {
  const recordTypes = await connection.metadata.list({
    type: 'RecordType',
  });
  return recordTypes;
}

type RecordType = {
  Id: string;
  EntityDefinitionId: string;
  IsActive: boolean;
};

async function queryRecordTypes(connection: Connection): Promise<RecordType[]> {
  const recordTypesResult = await connection.tooling.query<RecordType>(
    `SELECT Id, EntityDefinitionId, IsActive FROM RecordType`,
  );
  const recordTypes = recordTypesResult.records;
  return recordTypes;
}

function getRecordType(fullName: string, fileProperties, recordTypes) {
  const recordTypeFileProperty = fileProperties.find((fp) => fp.fullName === fullName);
  if (recordTypeFileProperty) {
    return recordTypes.find((x) => x.Id === recordTypeFileProperty.id);
  }
  return undefined;
}
