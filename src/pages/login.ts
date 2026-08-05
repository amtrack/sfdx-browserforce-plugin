import { Org, type Connection } from '@salesforce/core';
import { type Page } from 'playwright';
import { waitForPageErrors } from '../browserforce.js';

const POST_LOGIN_PATH = '/setup/forcecomHomepage.apexp';

/**
 * Identity interstitials Salesforce can redirect a login to.
 *
 * These are undocumented internals (see docs/adr/0001), but the login waits for
 * the post login path only, so it has to recognize them to fail fast instead of
 * hanging until the navigation timeout.
 */
const ENROLLMENT_GATE_PATH_PREFIX = '/_ui/identity/webauthn/';
const VERIFICATION_PATH_PREFIX = '/_ui/identity/verification/';

/**
 * The forced passkey enrollment interstitial ("Enrollment Gate",
 * e.g. /_ui/identity/webauthn/AddPasskeyUi) intercepting the login of a user
 * with zero passkey Registrations.
 */
export function isEnrollmentGateUrl(url: URL): boolean {
  return url.pathname.startsWith(ENROLLMENT_GATE_PATH_PREFIX);
}

/**
 * An identity verification interstitial ("Verify Your Identity",
 * e.g. /_ui/identity/verification/method/UnifiedPasskeyVerificationUi)
 * requiring a WebAuthn assertion or another second factor.
 */
export function isVerificationUrl(url: URL): boolean {
  return url.pathname.startsWith(VERIFICATION_PATH_PREFIX);
}

export type LoginOptions = {
  /**
   * Resolve instead of failing when the login is intercepted by the passkey
   * Enrollment Gate. Only the passkey plugin can do anything useful there.
   */
  tolerateEnrollmentGate?: boolean;
};

export class LoginPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async login(connection: Connection, options?: LoginOptions) {
    const org = await Org.create({ connection });
    const frontDoorUrl = await org.getFrontDoorUrl(POST_LOGIN_PATH);
    await this.page.goto(frontDoorUrl);
    const currentUrl = new URL(this.page.url());
    if (currentUrl.pathname === '/msg/maintenanceandavailable.jsp') {
      await this.page.goto(currentUrl.origin + POST_LOGIN_PATH);
    }
    await Promise.race([
      this.page.waitForURL((url) => url.pathname === POST_LOGIN_PATH),
      this.waitForIdentityInterstitial(options),
      waitForPageErrors(this.page),
    ]);
    return this;
  }

  /**
   * Identity interstitials are neither the post login page nor a page error, so
   * without this the login would hang until the navigation timeout.
   */
  private async waitForIdentityInterstitial(options?: LoginOptions): Promise<void> {
    let interstitial: 'enrollmentGate' | 'verification' | undefined;
    await this.page.waitForURL((url) => {
      if (isEnrollmentGateUrl(url)) {
        interstitial = 'enrollmentGate';
      } else if (isVerificationUrl(url)) {
        interstitial = 'verification';
      }
      return interstitial !== undefined;
    });
    if (interstitial === 'enrollmentGate') {
      if (options?.tolerateEnrollmentGate) {
        return;
      }
      throw new Error(
        `The login was intercepted by the passkey enrollment gate (${this.page.url()}), because this user has no passkey (Built-in Authenticator) yet.
👉 Please see the 'passkey' Browserforce setting to register one for a dedicated automation user.`,
      );
    }
    throw new Error(
      `The login was intercepted by an identity verification page (${this.page.url()}), which Browserforce cannot complete.
👉 If a passkey credential was injected using --passkey-credential, Salesforce did not accept it.`,
    );
  }
}
