import assert from 'assert';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  assertPasskeyCredentialFile,
  decodeBase64url,
  readCredentialFile,
  resolveCredentialFilePath,
  withSignCountHeadroom,
  writeCredentialFile,
  type PasskeyCredentialFile,
} from './credential-file.js';

const RP_ID = 'acme--dev.sandbox.my.salesforce.com';

const file: PasskeyCredentialFile = {
  rpId: RP_ID,
  registrationId: '0moRR0000000uzt',
  credential: {
    credentialId: 'dGVzdC1jcmVkZW50aWFsLWlk',
    isResidentCredential: true,
    rpId: RP_ID,
    privateKey: 'dGVzdC1wcml2YXRlLWtleQ',
    signCount: 1,
  },
};

describe('resolveCredentialFilePath', () => {
  it('should replace the <host> placeholder with the org hostname', () => {
    assert.strictEqual(resolveCredentialFilePath('./sf-passkey-<host>.json', RP_ID), `./sf-passkey-${RP_ID}.json`);
  });
  it('should leave a path without a placeholder alone', () => {
    assert.strictEqual(resolveCredentialFilePath('./passkey.json', RP_ID), './passkey.json');
  });
});

describe('readCredentialFile/writeCredentialFile', () => {
  let directory: string;
  before(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'browserforce-passkey-'));
  });
  after(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });

  it('should round trip the Credential and its Registration id', async () => {
    const credentialFile = path.join(directory, 'sub', 'passkey.json');
    await writeCredentialFile(credentialFile, file);
    assert.deepStrictEqual(await readCredentialFile(credentialFile), file);
  });
  it('should return undefined when nothing is held yet', async () => {
    assert.strictEqual(await readCredentialFile(path.join(directory, 'missing.json')), undefined);
  });
  it('should fail on a file that is not JSON', async () => {
    const credentialFile = path.join(directory, 'garbage.json');
    await fs.writeFile(credentialFile, 'not json');
    await assert.rejects(() => readCredentialFile(credentialFile), /Failed parsing passkey credential file/);
  });
});

describe('assertPasskeyCredentialFile', () => {
  const invalid: Array<{ description: string; value: unknown; expected: RegExp }> = [
    { description: 'not an object', value: 'nope', expected: /expected a JSON object/ },
    { description: 'missing rpId', value: { ...file, rpId: undefined }, expected: /'rpId' must be the org hostname/ },
    {
      description: 'a Registration id that is not a passkey',
      value: { ...file, registrationId: '0PS000000000000' },
      expected: /'registrationId' must be a passkey Registration id \(0mo\)/,
    },
    {
      description: 'a missing credential',
      value: { ...file, credential: undefined },
      expected: /'credential' must be an exported WebAuthn credential/,
    },
    {
      description: 'a missing signCount',
      value: { ...file, credential: { ...file.credential, signCount: undefined } },
      expected: /'credential.signCount' must be a number/,
    },
    {
      description: 'an empty private key',
      value: { ...file, credential: { ...file.credential, privateKey: '' } },
      expected: /'credential.privateKey' must be a base64url encoded string/,
    },
    {
      description: 'a credential id that is not base64url',
      value: { ...file, credential: { ...file.credential, credentialId: 'not base64!' } },
      expected: /'credential.credentialId' is not base64url encoded/,
    },
  ];
  it('should accept a valid file', () => {
    assert.deepStrictEqual(assertPasskeyCredentialFile(file, 'passkey.json'), file);
  });
  for (const t of invalid) {
    it(`should reject ${t.description}`, () => {
      assert.throws(() => assertPasskeyCredentialFile(t.value, 'passkey.json'), t.expected);
    });
  }
});

describe('decodeBase64url', () => {
  it('should decode base64', () => {
    assert.deepStrictEqual(decodeBase64url('AQID'), new Uint8Array([1, 2, 3]));
  });
  it('should decode the base64url alphabet', () => {
    assert.deepStrictEqual(decodeBase64url('-_8'), new Uint8Array([251, 255]));
  });
  it('should decode a padded value', () => {
    assert.deepStrictEqual(decodeBase64url('AQ=='), new Uint8Array([1]));
  });
  it('should reject invalid characters', () => {
    assert.throws(() => decodeBase64url('not base64!'), /is not base64url encoded/);
  });
  it('should reject an impossible length', () => {
    assert.throws(() => decodeBase64url('AQIDA'), /is not base64url encoded/);
  });
});

describe('withSignCountHeadroom', () => {
  it('should leave headroom for assertions we did not observe', () => {
    assert.strictEqual(withSignCountHeadroom(file.credential).signCount, 101);
  });
});
