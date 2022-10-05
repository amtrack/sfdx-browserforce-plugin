import { Org } from '@salesforce/core';
import assert from 'assert';
import * as child from 'child_process';
import * as path from 'path';
import { CertificateAndKeyManagement } from './certificate-and-key-management';
import { IdentityProvider } from './identity-provider';

describe(`${CertificateAndKeyManagement.name} and ${IdentityProvider.name}`, function() {
  this.slow('30s');
  this.timeout('2m');
  it('should fail to enable identity provider with non-existing Certificate', () => {
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'identity-provider', 'enable.json'))
    ]);
    assert.deepStrictEqual(cmd.status, 1, cmd.output.toString());
    assert.ok(
      /changing 'identityProvider' to .*"enabled":true/.test(
        cmd.output.toString()
      ),
      cmd.output.toString()
    );
    assert.ok(
      /Could not find Certificate 'identity_provider'/.test(
        cmd.output.toString()
      ),
      cmd.output.toString()
    );
  });
  it('should create a self-signed certificate and enable Identity Provider', function() {
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(
        path.join(__dirname, 'identity-provider', 'create-cert-and-enable.json')
      )
    ]);
    assert.deepStrictEqual(cmd.status, 0, cmd.output.toString());
    assert.ok(
      /changing 'certificateAndKeyManagement' to '{"certificates":\[.*"name":"identity_provider"/.test(
        cmd.output.toString()
      ),
      cmd.output.toString()
    );
    assert.ok(
      /changing 'identityProvider' to .*"enabled":true/.test(
        cmd.output.toString()
      ),
      cmd.output.toString()
    );
  });
  it('should not do anything if self-signed certificate is already available', () => {
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(
        path.join(__dirname, 'identity-provider', 'create-cert-and-enable.json')
      )
    ]);
    assert.deepStrictEqual(cmd.status, 0, cmd.output.toString());
    assert.ok(
      /no action necessary/.test(cmd.output.toString()),
      cmd.output.toString()
    );
  });
  it('should disable Identity Provider', () => {
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'identity-provider', 'disable.json'))
    ]);
    assert.deepStrictEqual(cmd.status, 0, cmd.output.toString());
    assert.ok(
      /changing 'identityProvider' to .*"enabled":false/.test(
        cmd.output.toString()
      ),
      cmd.output.toString()
    );
  });
  it('should import a cert from a keystore', () => {
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(
        path.join(
          __dirname,
          'certificate-and-key-management',
          'import-from-keystore.json'
        )
      )
    ]);
    assert.deepStrictEqual(cmd.status, 0, cmd.output.toString());
    assert.ok(
      /changing 'certificateAndKeyManagement' to '{"importFromKeystore":\[.*"filePath"/.test(
        cmd.output.toString()
      ),
      cmd.output.toString()
    );
  });
  it('should not do anything if cert is already available in keystore', () => {
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(
        path.join(
          __dirname,
          'certificate-and-key-management',
          'import-from-keystore.json'
        )
      )
    ]);
    assert.deepStrictEqual(cmd.status, 0, cmd.output.toString());
    assert.ok(
      /no action necessary/.test(cmd.output.toString()),
      cmd.output.toString()
    );
  });
  it('should delete certificates using Metadata API', async () => {
    const org = await Org.create({});
    const conn = org.getConnection();
    await conn.metadata.delete('Certificate', ['identity_provider', 'Dummy']);
  });
});
