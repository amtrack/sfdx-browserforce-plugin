import { promises as fs } from 'fs';
import * as path from 'path';
import { REGISTRATION_ID_PREFIX } from './registrations.js';
import { type VirtualAuthenticatorCredential } from './virtual-authenticator.js';

/**
 * The persisted passkey: the client side Credential together with the id of
 * the server side Registration it belongs to.
 *
 * ⚠️ Contains the authenticator private key and is password-equivalent. Keep it
 * out of version control and treat it as a secret. It is only valid for the org
 * it was created for (rpId is the org hostname) and dies on a sandbox refresh.
 */
export type PasskeyCredentialFile = {
  rpId: string;
  registrationId: string;
  credential: VirtualAuthenticatorCredential;
};

/**
 * Credentials are only valid for one org, so a config shared across orgs needs
 * one file per org. `<host>` in the configured path is replaced by the org
 * hostname (which is the rpId).
 */
export function resolveCredentialFilePath(credentialFile: string, host: string): string {
  return credentialFile.split('<host>').join(host);
}

/**
 * Salesforce increments the signature counter on every assertion. A vaulted
 * counter can be behind the server's, which looks like a cloned authenticator,
 * so leave headroom when injecting (the POC scripts do the same).
 */
const SIGN_COUNT_HEADROOM = 100;

export function withSignCountHeadroom(credential: VirtualAuthenticatorCredential): VirtualAuthenticatorCredential {
  return { ...credential, signCount: credential.signCount + SIGN_COUNT_HEADROOM };
}

/**
 * @returns undefined when the file does not exist (nothing is held yet)
 */
export async function readCredentialFile(credentialFile: string): Promise<PasskeyCredentialFile | undefined> {
  let contents: string;
  try {
    contents = await fs.readFile(path.resolve(credentialFile), 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw err;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch (err) {
    throw new Error(`Failed parsing passkey credential file '${credentialFile}'`);
  }
  return assertPasskeyCredentialFile(parsed, credentialFile);
}

export async function writeCredentialFile(credentialFile: string, file: PasskeyCredentialFile): Promise<void> {
  const filePath = path.resolve(credentialFile);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  // 0o600: password-equivalent (no effect on Windows)
  await fs.writeFile(filePath, `${JSON.stringify(file, null, 2)}\n`, { mode: 0o600 });
}

export function assertPasskeyCredentialFile(value: unknown, credentialFile: string): PasskeyCredentialFile {
  const invalid = (message: string) => new Error(`Invalid passkey credential file '${credentialFile}': ${message}`);
  if (typeof value !== 'object' || value === null) {
    throw invalid('expected a JSON object');
  }
  const file = value as Partial<PasskeyCredentialFile>;
  if (typeof file.rpId !== 'string' || !file.rpId.length) {
    throw invalid(`'rpId' must be the org hostname`);
  }
  if (typeof file.registrationId !== 'string' || !file.registrationId.startsWith(REGISTRATION_ID_PREFIX)) {
    throw invalid(`'registrationId' must be a passkey Registration id (${REGISTRATION_ID_PREFIX})`);
  }
  const credential = file.credential;
  if (typeof credential !== 'object' || credential === null) {
    throw invalid(`'credential' must be an exported WebAuthn credential`);
  }
  if (typeof credential.signCount !== 'number') {
    throw invalid(`'credential.signCount' must be a number`);
  }
  for (const key of ['credentialId', 'privateKey'] as const) {
    const encoded = credential[key];
    if (typeof encoded !== 'string' || !encoded.length) {
      throw invalid(`'credential.${key}' must be a base64url encoded string`);
    }
    try {
      decodeBase64url(encoded);
    } catch (err) {
      throw invalid(`'credential.${key}' is not base64url encoded`);
    }
  }
  return file as PasskeyCredentialFile;
}

/**
 * Decodes a base64url (or plain base64) encoded value, as used for the
 * credential id and the private key.
 */
export function decodeBase64url(encoded: string): Uint8Array {
  const base64 = encoded.split('-').join('+').split('_').join('/').replace(/=+$/, '');
  if (!/^[A-Za-z0-9+/]*$/.test(base64) || base64.length % 4 === 1) {
    throw new Error(`'${encoded}' is not base64url encoded`);
  }
  return new Uint8Array(Buffer.from(base64, 'base64'));
}
