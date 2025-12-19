import type { Record } from '@jsforce/jsforce-node';
import { existsSync } from 'fs';
import * as path from 'path';
import type { ElementHandle } from 'puppeteer';
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
    if (definition?.certificates?.length || definition?.importFromKeystore?.length) {
      existingCertificates = // Note: Unfortunately scanAll=false has no impact and returns deleted records.
        // Workaround: Order by CreatedDate DESC to get the latest record first.
        (
          await this.org
            .getConnection()
            .tooling.query<CertificateRecord>(
              `SELECT Id, DeveloperName, MasterLabel, OptionsIsPrivateKeyExportable, KeySize FROM Certificate ORDER BY CreatedDate DESC`,
              { scanAll: false },
            )
        )?.records;
    }
    if (definition?.certificates?.length) {
      for (const cert of definition.certificates) {
        const existingCert = existingCertificates.find((co) => co.DeveloperName === cert.name);
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
        const existingCert = existingCertificates.find((co) => co.DeveloperName === cert.name);
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
        const existingCert = state.certificates.find((c) => c.name === cert.name);
        if (existingCert) {
          // copy id from state to definition to be retained and used
          cert._id = existingCert._id;
        }
        const certDiff = super.diff(existingCert, cert) as Certificate | undefined;
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
        (cert) => !state?.importFromKeystore?.find((c) => c.name === cert.name),
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
            `${CERT_PREFIX_PATH}/e?${queryString.stringify(urlAttributes)}`,
          );
          await page.waitForSelector(SAVE_BUTTON_SELECTOR);
          await Promise.all([page.waitForNavigation(), page.click(SAVE_BUTTON_SELECTOR)]);
          await page.close();
        }
      }
    }
    if (plan.importFromKeystore) {
      for (const certificate of plan.importFromKeystore) {
        const page = await this.browserforce.openPage(`${KEYSTORE_IMPORT_PATH}`);
        await page.waitForSelector(FILE_UPLOAD_SELECTOR);
        const elementHandle = (await page.$(FILE_UPLOAD_SELECTOR)) as ElementHandle<HTMLInputElement>;
        // TODO: make relative to this.command.flags.definitionfile
        if (!certificate.filePath) {
          throw new Error(`To import a certificate, the filePath is mandatory.`);
        }
        const filePath = path.resolve(certificate.filePath);
        if (!existsSync(filePath)) {
          throw new Error(`file does not exist: ${filePath}`);
        }
        await elementHandle.uploadFile(filePath);
        if (certificate.password) {
          await page.waitForSelector(KEYSTORE_PASSWORD_SELECTOR);
          await page.type(KEYSTORE_PASSWORD_SELECTOR, certificate.password);
        }
        await page.waitForSelector(SAVE_BUTTON_SELECTOR);
        await Promise.all([page.waitForNavigation(), page.click(SAVE_BUTTON_SELECTOR)]);
        try {
          await this.browserforce.throwPageErrors(page);
        } catch (e) {
          if (e.message === 'Data Not Available') {
            throw new Error(
              'Failed to import certificate from Keystore. Please enable Identity Provider first. https://salesforce.stackexchange.com/questions/61618/import-keystore-in-certificate-and-key-management',
            );
          }
          throw e;
        }
        if (certificate.name) {
          // rename cert as it has the wrong name
          //  JKS aliases are case-insensitive (and so lowercase)
          const certsResponse = await this.org
            .getConnection()
            .tooling.query<CertificateRecord>(
              `SELECT Id FROM Certificate WHERE DeveloperName = '${certificate.name.toLowerCase()}'`,
            );
          const importedCert = certsResponse.records[0];
          const certPage = await this.browserforce.openPage(
            `${importedCert.Id}/e?MasterLabel=${certificate.name}&DeveloperName=${certificate.name}`,
          );
          await certPage.waitForSelector(SAVE_BUTTON_SELECTOR);
          await Promise.all([certPage.waitForNavigation(), certPage.click(SAVE_BUTTON_SELECTOR)]);
          await this.browserforce.throwPageErrors(certPage);
          await certPage.close();
        }
        await page.close();
      }
    }
  }
}
