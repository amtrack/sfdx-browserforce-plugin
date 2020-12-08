import { Connection } from '@salesforce/command/node_modules/@salesforce/core/lib/connection';
import { BrowserforcePlugin } from '../../plugin';
import { RecordTypePage } from './pages';

export default class RecordTypes extends BrowserforcePlugin {
  public async retrieve(definition?) {
    const conn = this.org.getConnection();
    const response = {
      deletions: []
    };
    const recordTypeFileProperties = await listRecordTypes(conn);
    const recordTypes = await queryRecordTypes(conn);
    for (const deletion of definition.deletions) {
      const recordType = getRecordType(
        deletion.fullName,
        recordTypeFileProperties,
        recordTypes
      );
      if (recordType) {
        if (recordType.IsActive) {
          throw new Error(
            `Cannot delete active RecordType: ${deletion.fullName}`
          );
        }
        if (deletion.replacement) {
          const replacementRecordType = getRecordType(
            deletion.replacement,
            recordTypeFileProperties,
            recordTypes
          );
          if (!replacementRecordType) {
            throw new Error(
              `Could not find replacement RecordType: ${deletion.replacement}`
            );
          }
        }
        response.deletions.push({
          ...deletion,
          actionRequired: true
        });
      } else {
        response.deletions.push(deletion);
      }
    }
    return response;
  }

  public async apply(config) {
    const conn = this.org.getConnection();
    const recordTypeFileProperties = await listRecordTypes(conn);
    const recordTypes = await queryRecordTypes(conn);

    for (const deletion of config.deletions) {
      const recordType = getRecordType(
        deletion.fullName,
        recordTypeFileProperties,
        recordTypes
      );
      const page = await this.browserforce.openPage(
        `ui/setup/rectype/RecordTypes?type=${recordType.EntityDefinitionId}`
      );
      const recordTypePage = new RecordTypePage(page);
      const deletePage = await recordTypePage.clickDeleteAction(recordType.Id);
      let newRecordTypeId;
      if (deletion.replacement) {
        const replacementRecordType = getRecordType(
          deletion.replacement,
          recordTypeFileProperties,
          recordTypes
        );
        newRecordTypeId = replacementRecordType.Id;
      }
      await deletePage.replace(newRecordTypeId);
    }
  }
}

async function listRecordTypes(conn) {
  return await conn.metadata.list({
    type: 'RecordType'
  });
}

type RecordType = {
  Id: string;
  EntityDefinitionId: string;
  IsActive: boolean;
};

async function queryRecordTypes(conn: Connection): Promise<Array<RecordType>> {
  const recordTypesResult = await conn.tooling.query<RecordType>(
    `SELECT Id, EntityDefinitionId, IsActive FROM RecordType`
  );
  const recordTypes = recordTypesResult.records;
  return recordTypes;
}

function getRecordType(fullName: string, fileProperties, recordTypes) {
  const recordTypeFileProperty = fileProperties.find(
    fp => fp.fullName === fullName
  );
  if (recordTypeFileProperty) {
    return recordTypes.find(x => x.Id === recordTypeFileProperty.id);
  }
  return undefined;
}
