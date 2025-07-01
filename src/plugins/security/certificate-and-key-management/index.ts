import type { Record } from '@jsforce/jsforce-node';
import { existsSync } from 'fs';
import * as path from 'path';
import * as queryString from 'querystring';
import { BrowserforcePlugin } from '../../../plugin.js';

const CERT_PREFIX_PATH = '0P1';
const KEYSTORE_IMPORT_PATH = '_ui/security/certificate/KeyStoreImportUi/e';

const FILE_UPLOAD_SELECTOR = 'input[type="file"]';
const KEYSTORE_PASSWORD_SELECTOR = 'input#Password';
const SAVE_BUTTON_SELECTOR = 'input[name="save"]';

interface CertificateRecord extends Record {
  DeveloperName: string;
  MasterLabel: string;
  OptionsIsPrivateKeyExportable: boolean;
  KeySize: number;
}

export type Config = {
  certificates?: Certificate[];
  importFromKeystore?: KeyStore[];
};

type Certificate = {
  name: string;
  label: string;
  exportable?: boolean;
  keySize?: number;
  _id?: string;
};

type KeyStore = {
  name: string;
  filePath?: string;
  password?: string;
};

export class CertificateAndKeyManagement extends BrowserforcePlugin {
  public async retrieve(definition: Config): Promise<Config> {
    const response: Config = {
      certificates: [],
      importFromKeystore: [],
    };
    let existingCertificates: CertificateRecord[] = [];
    if (
      definition?.certificates?.length ||
      definition?.importFromKeystore?.length
    ) {
      existingCertificates = (
        await this.org.getConnection().tooling.query<CertificateRecord>(
          `SELECT Id, DeveloperName, MasterLabel, OptionsIsPrivateKeyExportable, KeySize FROM Certificate`,
          { scanAll: false }
          // BUG in jsforce: query acts with scanAll:true and returns deleted CustomObjects.
          // It cannot be disabled.
        )
      )?.records;
    }
    if (definition?.certificates?.length) {
      for (const cert of definition.certificates) {
        const existingCert = existingCertificates.find(
          (co) => co.DeveloperName === cert.name
        );
        if (existingCert) {
          response.certificates!.push({
            _id: existingCert.Id,
            name: existingCert.DeveloperName,
            label: existingCert.MasterLabel,
            exportable: existingCert.OptionsIsPrivateKeyExportable,
            keySize: existingCert.KeySize,
          });
        }
      }
    }
    if (definition?.importFromKeystore?.length) {
      for (const cert of definition.importFromKeystore) {
        const existingCert = existingCertificates.find(
          (co) => co.DeveloperName === cert.name
        );
        if (existingCert) {
          response.importFromKeystore!.push({
            name: existingCert.DeveloperName,
          });
        }
      }
    }
    return response;
  }

  public diff(state?: Config, definition?: Config): Config | undefined {
    const response: Config = {};
    if (state && definition && state.certificates && definition.certificates) {
      for (const cert of definition.certificates) {
        const existingCert = state.certificates.find(
          (c) => c.name === cert.name
        );
        if (existingCert) {
          // copy id from state to definition to be retained and used
          cert._id = existingCert._id;
        }
        const certDiff = super.diff(existingCert, cert) as
          | Certificate
          | undefined;
        if (certDiff !== undefined) {
          if (!response.certificates) {
            response.certificates = [];
          }
          response.certificates!.push(certDiff);
        }
      }
    }
    if (definition?.importFromKeystore?.length) {
      const importFromKeystore = definition?.importFromKeystore?.filter(
        (cert) => !state?.importFromKeystore?.find((c) => c.name === cert.name)
      );
      if (importFromKeystore.length) {
        response.importFromKeystore = importFromKeystore;
      }
    }
    return Object.keys(response).length ? response : undefined;
  }

  public async apply(plan: Config): Promise<void> {
    if (plan.certificates) {
      for (const certificate of plan.certificates) {
        if (certificate._id) {
          // update
        } else {
          // create new
          const urlAttributes = {
            DeveloperName: certificate.name,
            MasterLabel: certificate.label,
          };
          if (certificate.keySize) {
            urlAttributes['keySize'] = certificate.keySize;
          }
          if (certificate.exportable !== undefined) {
            urlAttributes['exp'] = certificate.exportable ? 1 : 0;
          }
          const page = await this.browserforce.openPage(
            `${CERT_PREFIX_PATH}/e?${queryString.stringify(urlAttributes)}`
          );
          await Promise.all([
            page.waitForNavigation(),
            page.locator(SAVE_BUTTON_SELECTOR).click(),
          ]);
          await page.close();
        }
      }
    }
    if (plan.importFromKeystore) {
      for (const certificate of plan.importFromKeystore) {
        if (!certificate.filePath) {
          throw new Error(
            `To import a certificate, the filePath is mandatory.`
          );
        }
        // TODO: make relative to this.command.flags.definitionfile
        const filePath = path.resolve(certificate.filePath);
        if (!existsSync(filePath)) {
          throw new Error(`file does not exist: ${filePath}`);
        }
        const page = await this.browserforce.openPage(
          `${KEYSTORE_IMPORT_PATH}`
        );
        const fileUpload = await page
          .locator(FILE_UPLOAD_SELECTOR)
          .waitHandle();
        await fileUpload.uploadFile(filePath);
        await fileUpload.dispose();
        if (certificate.password) {
          await page
            .locator(KEYSTORE_PASSWORD_SELECTOR)
            .fill(certificate.password);
        }
        await Promise.all([
          page.waitForNavigation(),
          page.locator(SAVE_BUTTON_SELECTOR).click(),
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
          await Promise.all([
            certPage.waitForNavigation(),
            certPage.locator(SAVE_BUTTON_SELECTOR).click(),
          ]);
          await certPage.close();
        }
        await page.close();
      }
    }
  }
}
