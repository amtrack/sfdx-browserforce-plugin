import { existsSync } from 'fs';
import { SalesforceId } from 'jsforce';
import * as jsonMergePatch from 'json-merge-patch';
import * as path from 'path';
import * as queryString from 'querystring';
import { BrowserforcePlugin } from '../../../plugin';
import { removeEmptyValues } from '../../utils';

const PATHS = {
  CERT_PREFIX: '0P1',
  KEYSTORE_IMPORT: '_ui/security/certificate/KeyStoreImportUi/e'
};
const SELECTORS = {
  FILE_UPLOAD: 'input[type="file"]',
  KEYSTORE_PASSWORD: 'input#Password',
  SAVE_BUTTON: 'input[name="save"]'
};

interface CertificateRecord {
  Id: SalesforceId;
  DeveloperName: string;
  MasterLabel: string;
  OptionsIsPrivateKeyExportable: string;
  KeySize: string;
}

export class CertificateAndKeyManagement extends BrowserforcePlugin {
  public async retrieve(definition?) {
    const response = { certificates: [], importFromKeystore: [] };
    if (definition && definition.certificates) {
      const certificatesList = definition.certificates
        .map(cert => {
          return `'${cert.name}'`;
        })
        .join(',');
      const certificatesResponse = await this.org
        .getConnection()
        .tooling.query<CertificateRecord>(
          `SELECT Id, DeveloperName, MasterLabel, OptionsIsPrivateKeyExportable, KeySize FROM Certificate WHERE DeveloperName IN (${certificatesList})`,
          { scanAll: false }
        );
      // BUG in jsforce: query acts with scanAll:true and returns deleted CustomObjects.
      // It cannot be disabled.
      for (const cert of definition.certificates) {
        const existingCert = certificatesResponse.records.find(
          co => co.DeveloperName === cert.name
        );
        if (existingCert) {
          response.certificates.push({
            id: existingCert.Id,
            name: existingCert.DeveloperName,
            label: existingCert.MasterLabel,
            exportable: existingCert.OptionsIsPrivateKeyExportable,
            keySize: existingCert.KeySize
          });
        }
      }
    }
    return response;
  }

  public diff(state, definition) {
    const response = {
      certificates: [],
      importFromKeystore: []
    };
    if (state && definition && state.certificates && definition.certificates) {
      for (const cert of definition.certificates) {
        const existingCert = state.certificates.find(
          c => c.name === cert.DeveloperName
        );
        if (existingCert) {
          // move id from state to definition to be retained and used
          cert.id = existingCert.id;
          delete existingCert.id;
        }
        response.certificates.push(jsonMergePatch.generate(existingCert, cert));
      }
    }
    if (definition && definition.importFromKeystore) {
      response.importFromKeystore = definition.importFromKeystore;
    }
    return removeEmptyValues(response);
  }

  public async apply(plan) {
    if (plan.certificates) {
      for (const certificate of plan.certificates) {
        if (certificate.id) {
          // update
        } else {
          // create new
          const urlAttributes = {
            DeveloperName: certificate.name,
            MasterLabel: certificate.label
          };
          if (certificate.keySize) {
            urlAttributes['keySize'] = certificate.keySize;
          }
          if (certificate.exportable !== undefined) {
            urlAttributes['exp'] = certificate.exportable ? 1 : 0;
          }
          const page = await this.browserforce.openPage(
            `${PATHS.CERT_PREFIX}/e?${queryString.stringify(urlAttributes)}`
          );
          await page.waitForSelector(SELECTORS.SAVE_BUTTON);
          await Promise.all([
            page.waitForNavigation(),
            page.click(SELECTORS.SAVE_BUTTON)
          ]);
        }
      }
    }
    if (plan.importFromKeystore) {
      for (const certificate of plan.importFromKeystore) {
        const page = await this.browserforce.openPage(
          `${PATHS.KEYSTORE_IMPORT}`
        );
        await page.waitForSelector(SELECTORS.FILE_UPLOAD);
        const elementHandle = await page.$(SELECTORS.FILE_UPLOAD);
        // TODO: make relative to this.command.flags.definitionfile
        const filePath = path.resolve(certificate.filePath);
        if (!existsSync(filePath)) {
          throw new Error(`file does not exist: ${filePath}`);
        }
        await elementHandle.uploadFile(filePath);
        if (certificate.password) {
          await page.waitForSelector(SELECTORS.KEYSTORE_PASSWORD);
          await page.type(SELECTORS.KEYSTORE_PASSWORD, certificate.password);
        }
        await page.waitForSelector(SELECTORS.SAVE_BUTTON);
        await Promise.all([
          page.waitForNavigation(),
          page.click(SELECTORS.SAVE_BUTTON)
        ]);
        if (certificate.name) {
          // rename cert as it has the wrong name
          //  JKS aliases are case-insensitive (and so lowercase)
          const certsResponse = await this.org
            .getConnection()
            .tooling.query<CertificateRecord>(
              `SELECT Id FROM Certificate WHERE DeveloperName = '${certificate.name.toLowerCase()}'`
            );
          const importedCert = certsResponse.records[0];
          const certPage = await this.browserforce.openPage(
            `${importedCert.Id}/e?MasterLabel=${certificate.name}&DeveloperName=${certificate.name}`
          );
          await certPage.waitForSelector(SELECTORS.SAVE_BUTTON);
          await Promise.all([
            certPage.waitForNavigation(),
            certPage.click(SELECTORS.SAVE_BUTTON)
          ]);
        }
      }
    }
  }
}
