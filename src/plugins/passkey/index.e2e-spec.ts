import assert from 'assert';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { readCredentialFile, resolveCredentialFilePath } from './credential-file.js';
import { type Config, Passkey } from './index.js';

/**
 * Requires a DEDICATED automation user without a passkey (see the ADRs). The
 * spec enrolls a passkey and deletes it again, leaving the user as it was found.
 */
describe(Passkey.name, function () {
  let plugin: Passkey;
  let directory: string;
  let credentialFile: string;
  let rpId: string;

  before(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'browserforce-passkey-e2e-'));
    credentialFile = path.join(directory, 'sf-passkey-<host>.json');
    rpId = new URL(global.browserforce.getInstanceUrl()).host;
  });
  after(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });
  beforeEach(() => {
    plugin = new Passkey(global.browserforce);
  });
  afterEach(async () => {
    await plugin.close();
  });

  const configRegistered = (): Config => ({ registered: true, credentialFile });
  const configUnregistered = (): Config => ({ registered: false, credentialFile });

  it('should start without a passkey', async () => {
    const state = await plugin.retrieve(configRegistered());
    assert.deepStrictEqual(state.registrationIds, [], 'this user already has a passkey, please delete it first');
  });

  it('should register a passkey and save its credential', async () => {
    await plugin.run(configRegistered());
    const state = await plugin.retrieve(configRegistered());
    assert.strictEqual(state.registrationIds.length, 1);
    assert.strictEqual(state.registered, true);
    const file = await readCredentialFile(resolveCredentialFilePath(credentialFile, rpId));
    assert.strictEqual(file?.rpId, rpId);
    assert.strictEqual(file?.registrationId, state.registrationIds[0]);
    assert.ok(file?.credential.privateKey.length, 'expected the credential to hold a private key');
  });

  it('should already be registered', async () => {
    const res = await plugin.run(configRegistered());
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });

  it('should refuse to delete a passkey whose credential it does not hold', async () => {
    await assert.rejects(() => plugin.run({ registered: false }), /refusing to touch the passkey Registration/);
  });

  it('should delete the passkey', async () => {
    await plugin.run(configUnregistered());
    const state = await plugin.retrieve(configUnregistered());
    assert.deepStrictEqual(state.registrationIds, []);
  });

  it('should already be deleted', async () => {
    const res = await plugin.run(configUnregistered());
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
});
