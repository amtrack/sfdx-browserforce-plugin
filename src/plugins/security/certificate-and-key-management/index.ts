import type { Record } from '@jsforce/jsforce-node';
import { existsSync } from 'fs';
import * as path from 'path';
import * as queryString from 'querystring';
import { waitForPageErrors } from '../../../browserforce.js';
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
      existingCertificates =
        // Note: Unfortunately scanAll=false has no impact and returns deleted records.
        // Workaround: Order by CreatedDate DESC to get the latest record first.
        (
          await this.org
            .getConnection()
            .tooling.query<CertificateRecord>(
              `SELECT Id, DeveloperName, MasterLabel, OptionsIsPrivateKeyExportable, KeySize FROM Certificate ORDER BY CreatedDate DESC`,
              { scanAll: false }
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
          const urlAttributes: { [key: string]: string | number } = {
            DeveloperName: certificate.name,
            MasterLabel: certificate.label,
          };
          if (certificate.keySize) {
            urlAttributes['keySize'] = certificate.keySize;
          }
          if (certificate.exportable !== undefined) {
            urlAttributes['exp'] = certificate.exportable ? 1 : 0;
          }
          await using page = await this.browserforce.openPage(
            `${CERT_PREFIX_PATH}/e?${queryString.stringify(urlAttributes)}`
          );
          await page.locator(SAVE_BUTTON_SELECTOR).first().click();
          // -> id (15 character Salesforce ID starting with 0P1)
          await page.waitForURL((url) => /\/0P1\w{12}/.test(url.pathname));
        }
      }
    }
    if (plan.importFromKeystore) {
      for (const certificate of plan.importFromKeystore) {
        // TODO: make relative to this.command.flags.definitionfile
        if (!certificate.filePath) {
          throw new Error(
            `To import a certificate, the filePath is mandatory.`
          );
        }
        const filePath = path.resolve(certificate.filePath);
        if (!existsSync(filePath)) {
          throw new Error(`file does not exist: ${filePath}`);
        }
        await using page = await this.browserforce.openPage(
          `${KEYSTORE_IMPORT_PATH}`
        );
        await page.locator(FILE_UPLOAD_SELECTOR).setInputFiles(filePath);
        if (certificate.password) {
          await page
            .locator(KEYSTORE_PASSWORD_SELECTOR)
            .fill(certificate.password);
        }
        await page.locator(SAVE_BUTTON_SELECTOR).first().click();
        await Promise.race([
          page.waitForURL((url) => url.pathname !== `/${KEYSTORE_IMPORT_PATH}`),
          (async () => {
            try {
              await waitForPageErrors(page);
            } catch (e) {
              if (e instanceof Error && e.message === 'Data Not Available') {
                throw new Error(
                  'Failed to import certificate from Keystore. Please enable Identity Provider first. https://salesforce.stackexchange.com/questions/61618/import-keystore-in-certificate-and-key-management'
                );
              }
              throw e;
            }
          })(),
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
          await using certPage = await this.browserforce.openPage(
            `${importedCert.Id}/e?MasterLabel=${certificate.name}&DeveloperName=${certificate.name}`
          );
          await certPage.locator(SAVE_BUTTON_SELECTOR).first().click();
          await Promise.race([
            await page.waitForURL(
              (url) => url.pathname !== `/${importedCert.Id}/e`
            ),
            waitForPageErrors(certPage),
          ]);
        }
      }
    }
  }
}
