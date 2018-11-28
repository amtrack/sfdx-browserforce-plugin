import * as assert from 'assert';
import * as child from 'child_process';
import * as path from 'path';
import CertificateAndKeyManagement from './certificate-and-key-management';
import IdentityProvider from './identity-provider';

describe(`${CertificateAndKeyManagement.name} and ${
  IdentityProvider.name
}`, () => {
  it('should fail to enable identity provider with non-existing Certificate', function() {
    this.timeout(1000 * 60);
    this.slow(1000 * 15);
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'identity-provider', 'enable.json'))
    ]);
    assert.deepEqual(cmd.status, 1, cmd.output.toString());
    assert(
      /changing 'identityProvider' to .*"enabled":true/.test(
        cmd.output.toString()
      ),
      cmd.output.toString()
    );
    assert(
      /Could not find Certificate 'identity_provider'/.test(
        cmd.output.toString()
      ),
      cmd.output.toString()
    );
  });
  it('should create a self-signed certificate and enable Identity Provider', function() {
    this.timeout(1000 * 60);
    this.slow(1000 * 15);
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(
        path.join(__dirname, 'identity-provider', 'create-cert-and-enable.json')
      )
    ]);
    assert.deepEqual(cmd.status, 0, cmd.output.toString());
    assert(
      /changing 'certificateAndKeyManagement' to '{"certificates":\[.*"name":"identity_provider"/.test(
        cmd.output.toString()
      ),
      cmd.output.toString()
    );
    assert(
      /changing 'identityProvider' to .*"enabled":true/.test(
        cmd.output.toString()
      ),
      cmd.output.toString()
    );
  });
  it('should disable Identity Provider', function() {
    this.timeout(1000 * 60);
    this.slow(1000 * 15);
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'identity-provider', 'disable.json'))
    ]);
    assert.deepEqual(cmd.status, 0, cmd.output.toString());
    assert(
      /changing 'identityProvider' to .*"enabled":false/.test(
        cmd.output.toString()
      ),
      cmd.output.toString()
    );
  });
  it.skip('should not do anything if self-signed certificate is already available', function() {
    this.timeout(1000 * 60);
    this.slow(1000 * 15);
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(
        path.join(
          __dirname,
          'certificate-and-key-management',
          'create-self-signed-cert.json'
        )
      )
    ]);
    assert.deepEqual(cmd.status, 0, cmd.output.toString());
    assert(
      /no action necessary/.test(cmd.output.toString()),
      cmd.output.toString()
    );
  });
  it('should import a cert from a keystore', function() {
    this.timeout(1000 * 60);
    this.slow(1000 * 15);
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
    assert.deepEqual(cmd.status, 0, cmd.output.toString());
    assert(
      /changing 'certificateAndKeyManagement' to '{"importFromKeystore":\[.*"filePath"/.test(
        cmd.output.toString()
      ),
      cmd.output.toString()
    );
  });
});
