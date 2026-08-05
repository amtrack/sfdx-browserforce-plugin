import { type CDPSession, type Page } from 'playwright';

/**
 * The client side key material of a passkey (a WebAuthn Credential) as
 * exported from / imported into a Virtual Authenticator over the Chrome
 * DevTools Protocol. Contains the private key: password-equivalent.
 */
export type VirtualAuthenticatorCredential = {
  credentialId: string;
  isResidentCredential: boolean;
  /** the Relying Party id, which is the org hostname (My Domain) */
  rpId?: string;
  /** the ECDSA P-256 private key in PKCS#8 format */
  privateKey: string;
  userHandle?: string;
  signCount: number;
  largeBlob?: string;
  backupEligibility?: boolean;
  backupState?: boolean;
  userName?: string;
  userDisplayName?: string;
};

// Salesforce requests attestation "direct" but does not verify the AAGUID, and
// does not restrict the authenticator attachment (see poc/README.md).
const VIRTUAL_AUTHENTICATOR_OPTIONS = {
  protocol: 'ctap2',
  transport: 'internal',
  hasResidentKey: true,
  hasUserVerification: true,
  isUserVerified: true,
  automaticPresenceSimulation: true,
} as const;

/**
 * A software authenticator emulated over the Chrome DevTools Protocol, scoped
 * to a single page (Chromium enables the virtual authenticator environment per
 * frame tree, so it survives navigations of that page only).
 *
 * IMPORTANT: attach exactly ONE authenticator per page. A stray second (empty)
 * authenticator intercepts navigator.credentials.get and fails it with
 * NotAllowedError (see docs/adr/0002).
 */
export class VirtualAuthenticator {
  private readonly cdpSession: CDPSession;
  private readonly authenticatorId: string;

  private constructor(cdpSession: CDPSession, authenticatorId: string) {
    this.cdpSession = cdpSession;
    this.authenticatorId = authenticatorId;
  }

  public static async attach(
    page: Page,
    credentials: VirtualAuthenticatorCredential[] = [],
  ): Promise<VirtualAuthenticator> {
    const cdpSession = await page.context().newCDPSession(page);
    await cdpSession.send('WebAuthn.enable');
    const { authenticatorId } = await cdpSession.send('WebAuthn.addVirtualAuthenticator', {
      options: { ...VIRTUAL_AUTHENTICATOR_OPTIONS },
    });
    const authenticator = new VirtualAuthenticator(cdpSession, authenticatorId);
    for (const credential of credentials) {
      await authenticator.addCredential(credential);
    }
    return authenticator;
  }

  public async addCredential(credential: VirtualAuthenticatorCredential): Promise<void> {
    await this.cdpSession.send('WebAuthn.addCredential', {
      authenticatorId: this.authenticatorId,
      credential,
    });
  }

  public async getCredentials(): Promise<VirtualAuthenticatorCredential[]> {
    const { credentials } = await this.cdpSession.send('WebAuthn.getCredentials', {
      authenticatorId: this.authenticatorId,
    });
    return credentials;
  }
}
