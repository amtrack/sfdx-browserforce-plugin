import { Org } from '@salesforce/core';
import assert from 'assert';
import { CertificateAndKeyManagement } from './certificate-and-key-management';
import { IdentityProvider } from './identity-provider';

describe(`${CertificateAndKeyManagement.name} and ${IdentityProvider.name}`, function () {
  let pluginIdentityProvider: IdentityProvider;
  let pluginCertificateManagement: CertificateAndKeyManagement;
  before(() => {
    pluginIdentityProvider = new IdentityProvider(global.bf);
    pluginCertificateManagement = new CertificateAndKeyManagement(global.bf);
  });

  const configEnabled = {
    enabled: true,
    certificate: 'identity_provider'
  };
  const configDisabled = {
    enabled: false
  };
  const configGeneratedCert = {
    certificates: [
      {
        name: 'identity_provider',
        label: 'identity_provider'
      }
    ]
  };
  const configImportFromKeystore = {
    importFromKeystore: [
      {
        filePath: './src/plugins/security/certificate-and-key-management/Dummy.jks',
        name: 'Dummy'
      }
    ]
  };

  it('should fail to enable identity provider with non-existing Certificate', async () => {
    let err;
    try {
      await pluginIdentityProvider.run(configEnabled);
    } catch (e) {
      err = e;
    }
    assert.throws(() => {
      throw err;
    }, /Could not find Certificate 'identity_provider'/);
  });
  it('should create a self-signed certificate', async () => {
    await pluginCertificateManagement.apply(configGeneratedCert);
  });
  it('should not do anything if self-signed certificate is already available', async () => {
    // explictly pass definition to retrieve
    const res = await pluginCertificateManagement.run(configGeneratedCert);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
  it('should enable Identity Provider with generated cert', async () => {
    await pluginIdentityProvider.apply(configEnabled);
  });
  it('Identity Provider should be enabled', async () => {
    const state = await pluginIdentityProvider.retrieve();
    assert.deepStrictEqual(state.enabled, true);
  });
  it('should disable Identity Provider', async () => {
    await pluginIdentityProvider.apply(configDisabled);
  });
  it('Identity Provider should be disabled', async () => {
    const state = await pluginIdentityProvider.retrieve();
    assert.deepStrictEqual(state.enabled, false);
  });
  it('should import a cert from a keystore', async () => {
    await pluginCertificateManagement.run(configImportFromKeystore);
  });
  it('should not do anything if cert is already available in keystore', async () => {
    const res = await pluginCertificateManagement.run(configImportFromKeystore);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
  it('should delete certificates using Metadata API', async () => {
    const org = await Org.create({});
    const conn = org.getConnection();
    await conn.metadata.delete('Certificate', ['identity_provider', 'Dummy']);
  });
});
