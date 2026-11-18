import assert from 'assert';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CertificateAndKeyManagement, CERT_PREFIX_PATH } from './index.js';
import { securitySchema } from '../index.js';
import { capture } from '../../../../test/capture.js';

describe(CertificateAndKeyManagement.name, function () {
  let pluginCertificateManagement: CertificateAndKeyManagement;
  before(() => {
    pluginCertificateManagement = new CertificateAndKeyManagement(global.browserforce);
  });

  const configCreatedCert = {
    certificates: [
      {
        name: 'foo',
        label: 'foo',
        keysize: 4096,
      },
    ],
  };
  const configImportFromKeystore = {
    importFromKeystore: [
      {
        filePath: './src/plugins/security/certificate-and-key-management/Dummy.jks',
        name: 'Dummy',
      },
    ],
  };
  it('should enable Identity Provider as a prerequisite', async () => {
    // https://salesforce.stackexchange.com/questions/61618/import-keystore-in-certificate-and-key-management
    const __dirname = fileURLToPath(new URL('.', import.meta.url));
    const dir = resolve(join(__dirname, 'sfdx-source', 'identity-provider'));
    const sourceDeployCmd = spawnSync('sf', ['project', 'deploy', 'start', '-d', dir, '--json']);
    assert.deepStrictEqual(sourceDeployCmd.status, 0, sourceDeployCmd.output.toString());
  });
  it('should delete the certificates of a previous run', async () => {
    // a keystore cannot be imported over its certificate
    await global.browserforce.connection.metadata.delete('Certificate', ['Dummy', 'AcmeSelfSigned']);
  });
  it(
    'should import a certificate from a keystore and create a self-signed one @capture',
    capture(securitySchema, {
      config: {
        certificateAndKeyManagement: {
          importFromKeystore: [
            {
              name: 'Dummy',
              filePath: './src/plugins/security/certificate-and-key-management/Dummy.jks',
              password: '',
            },
          ],
          certificates: [{ name: 'AcmeSelfSigned', label: 'Acme Self Signed', keysize: 2048, exportable: true }],
        },
      },
      pages: {
        certificates: {
          open: (doc) => doc.open(CERT_PREFIX_PATH),
          context: ['.bPageTitle', '.bRelatedList, .listRelatedObject, .bPageBlock'],
          pills: {
            'certificateAndKeyManagement.importFromKeystore[0].name': 'tr.dataRow:has(:text-matches("^dummy$", "i"))',
          },
        },
      },
    }),
  );
  it('should create a self-signed certificate', async () => {
    await pluginCertificateManagement.apply(configCreatedCert);
  });
  it('should not do anything if self-signed certificate is already available', async () => {
    // explictly pass definition to retrieve
    const res = await pluginCertificateManagement.run(configCreatedCert);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
  it('should import a cert from a keystore', async () => {
    await pluginCertificateManagement.run(configImportFromKeystore);
  });
  it('should not do anything if cert is already available in keystore', async () => {
    const res = await pluginCertificateManagement.run(configImportFromKeystore);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
  it('should disable Identity Provider', async () => {
    const __dirname = fileURLToPath(new URL('.', import.meta.url));
    const dir = resolve(join(__dirname, 'sfdx-source', 'disable-identity-provider'));
    const sourceDeployCmd = spawnSync('sf', ['project', 'deploy', 'start', '-d', dir, '--json']);
    assert.deepStrictEqual(sourceDeployCmd.status, 0, sourceDeployCmd.output.toString());
  });
  it('should delete certificates using Metadata API', async () => {
    await global.browserforce.connection.metadata.delete('Certificate', ['identity_provider', 'foo', 'Dummy']);
  });
});
