import { type Page } from 'playwright';
import { type SalesforceUrlPath } from '../../browserforce.js';
import { isEnrollmentGateUrl } from '../../pages/login.js';
import { BrowserforcePlugin } from '../../plugin.js';
import { readCredentialFile, resolveCredentialFilePath, writeCredentialFile } from './credential-file.js';
import { decide, partitionRegistrations, type PasskeyConfig, type PasskeyPlan, type PasskeyState } from './decision.js';
import { parseRegistrationCount, parseRegistrationId } from './registrations.js';
import { VirtualAuthenticator } from './virtual-authenticator.js';

export type Config = PasskeyConfig;
export type State = PasskeyState;
export type Plan = PasskeyPlan;

const CREATE_PASSKEY_BUTTON = /create passkey/i;
// the voluntary "Register" link of the Built-in Authenticators related list,
// which goes straight to the create ceremony while the user has no Registration
const REGISTER_LINK = 'a[href*="registrationInterstitial.apexp"]';
const REGISTRATION_DELETE_LINK = 'a[href*="delID=0mo"]';
const CLASSIC_PAGE_BLOCK = '.bPageBlock';

const ENROLLMENT_TIMEOUT_MS = 60_000;
const DELETION_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 2_000;

/**
 * Registers (or deletes) the single passkey of a dedicated automation user.
 *
 * ⚠️ Only point this at a user reserved for automation. Salesforce requires an
 * assertion against an existing passkey to add a second one, which no
 * automation can do for a passkey it does not hold, so a human passkey and an
 * automation passkey cannot coexist on one user.
 *
 * See docs/adr/0001-passkey-plugin-exactly-one-on-dedicated-privileged-user.md
 * and CONTEXT.md for the vocabulary (Credential vs Registration vs Gate).
 */
export class Passkey extends BrowserforcePlugin {
  /** the page the Virtual Authenticator is attached to (the enrollment ceremony needs it) */
  private authenticatorPage?: Page;
  private authenticator?: VirtualAuthenticator;
  private atEnrollmentGate = false;

  public async retrieve(definition?: Config): Promise<State> {
    const held = await this.readHeldCredential(definition);
    await this.openAuthenticatorSession();
    // A user with zero Registrations cannot reach any post login page, so the
    // Enrollment Gate itself is the definitive "zero Registrations" signal.
    const registrationIds = this.atEnrollmentGate ? [] : await this.getRegistrationIds();
    return {
      registrationIds,
      heldRegistrationId: held?.registrationId,
      registered: held !== undefined && registrationIds.includes(held.registrationId),
    };
  }

  /**
   * `credentialFile` and `force` are inputs, not state, so the generic deep
   * diff would always report a change. The plan is the decision instead.
   */
  public diff(state: State, definition: Config): Plan | undefined {
    const plan = decide(state, this.normalize(definition));
    if (plan.action === 'refuse') {
      throw new Error(plan.reason);
    }
    if (plan.action === 'none') {
      const { foreign } = partitionRegistrations(state);
      if (foreign.length) {
        this.browserforce.logger?.warn(
          `this user also has the passkey Registration(s) ${foreign.join(', ')}, whose Credential we do not hold`,
        );
      }
      return undefined;
    }
    return plan;
  }

  public async apply(plan: Plan): Promise<void> {
    switch (plan.action) {
      case 'none':
        return;
      case 'refuse':
        throw new Error(plan.reason);
      case 'enroll':
        await this.enroll(plan.credentialFile);
        return;
      case 'delete':
        await this.deleteRegistrations(plan.registrationIds);
        return;
      case 'replace':
        // enrolling requires zero Registrations (no assertion step-up there)
        await this.deleteRegistrations(plan.registrationIds);
        await this.enroll(plan.credentialFile);
        return;
    }
  }

  public async run(definition: unknown): Promise<unknown> {
    try {
      return await super.run(definition);
    } finally {
      await this.close();
    }
  }

  public async close(): Promise<void> {
    await this.authenticatorPage?.close();
    this.authenticatorPage = undefined;
    this.authenticator = undefined;
    this.atEnrollmentGate = false;
  }

  private normalize(definition: Config): Config {
    return {
      ...definition,
      credentialFile: this.getCredentialFilePath(definition),
    };
  }

  private getCredentialFilePath(definition?: Config): string | undefined {
    if (!definition?.credentialFile) {
      return undefined;
    }
    return resolveCredentialFilePath(definition.credentialFile, this.getRpId());
  }

  /** the Relying Party id of the org, which is its hostname */
  private getRpId(): string {
    return new URL(this.browserforce.getInstanceUrl()).host;
  }

  private async readHeldCredential(definition?: Config) {
    const credentialFile = this.getCredentialFilePath(definition);
    if (!credentialFile) {
      return undefined;
    }
    const file = await readCredentialFile(credentialFile);
    if (!file) {
      return undefined;
    }
    if (file.rpId !== this.getRpId()) {
      // a Credential is bound to the org hostname and dies on a sandbox refresh
      this.browserforce.logger?.warn(
        `ignoring the passkey credential file '${credentialFile}': it belongs to '${file.rpId}', but this org is '${this.getRpId()}'`,
      );
      return undefined;
    }
    return file;
  }

  /**
   * Logs in on a page with a Virtual Authenticator attached, tolerating the
   * Enrollment Gate (which is where the enrollment ceremony happens).
   */
  private async openAuthenticatorSession(): Promise<Page> {
    if (this.authenticatorPage) {
      return this.authenticatorPage;
    }
    const page = await this.browserforce.browserContext.newPage();
    // exactly ONE Virtual Authenticator, see docs/adr/0002
    this.authenticator = await VirtualAuthenticator.attach(page);
    await this.browserforce.loginOnPage(page, { tolerateEnrollmentGate: true });
    this.authenticatorPage = page;
    this.atEnrollmentGate = isEnrollmentGateUrl(new URL(page.url()));
    return page;
  }

  private async getUserDetailPath(): Promise<SalesforceUrlPath> {
    const identity = await this.browserforce.connection.identity();
    // the passkey has no API representation and only surfaces on the classic
    // user detail page (undocumented internals)
    return `/${identity.user_id}?noredirect=1&isUserEntityOverride=1`;
  }

  private async getRegistrationIds(): Promise<string[]> {
    await using page = await this.browserforce.openPage(await this.getUserDetailPath());
    await page.locator(CLASSIC_PAGE_BLOCK).first().waitFor();
    const registrationIds: string[] = [];
    for (const link of await page.locator(REGISTRATION_DELETE_LINK).all()) {
      registrationIds.push(parseRegistrationId(await link.getAttribute('href')));
    }
    const count = parseRegistrationCount(await page.locator('body').innerText());
    if (count === undefined) {
      this.browserforce.logger?.warn(
        `could not find the 'Built-in Authenticators' related list on the user detail page, relying on ${registrationIds.length} delete link(s)`,
      );
    } else if (count !== registrationIds.length) {
      throw new Error(
        `found ${count} passkey Registration(s) on the user detail page, but ${registrationIds.length} delete link(s). Refusing to guess which one to manage.`,
      );
    }
    return registrationIds;
  }

  private async enroll(credentialFile?: string): Promise<void> {
    const page = await this.openAuthenticatorSession();
    const authenticator = this.authenticator;
    if (!authenticator) {
      throw new Error('no Virtual Authenticator attached');
    }
    if (!this.atEnrollmentGate) {
      await this.openVoluntaryEnrollment(page);
    }
    const credentialsBefore = (await authenticator.getCredentials()).length;
    const urlBeforeCreate = page.url();
    await page.getByRole('button', { name: CREATE_PASSKEY_BUTTON }).click();
    await waitUntil(async () => (await authenticator.getCredentials()).length > credentialsBefore, {
      timeoutMs: ENROLLMENT_TIMEOUT_MS,
      description: 'the Virtual Authenticator to create a Credential',
    });
    this.atEnrollmentGate = false;
    // The ceremony posts the attestation to Salesforce and navigates on, which
    // is when the Registration exists and the Enrollment Gate is cleared.
    try {
      await page.waitForURL((url) => url.href !== urlBeforeCreate, { timeout: ENROLLMENT_TIMEOUT_MS / 3 });
    } catch (err) {
      // the voluntary enrollment path may not navigate at all
    }
    const registrationIds = await waitUntil(
      async () => {
        const ids = await this.getRegistrationIds();
        return ids.length ? ids : undefined;
      },
      { timeoutMs: ENROLLMENT_TIMEOUT_MS, description: 'the passkey Registration to appear' },
    );
    if (registrationIds.length !== 1) {
      throw new Error(`expected exactly one passkey Registration after enrolling, but found ${registrationIds.length}`);
    }
    const credentials = await authenticator.getCredentials();
    if (credentials.length !== 1) {
      throw new Error(`expected exactly one Credential in the Virtual Authenticator, but found ${credentials.length}`);
    }
    this.browserforce.logger?.log(`registered the passkey ${registrationIds[0]}`);
    if (!credentialFile) {
      // The private key dies with the browser process. The Registration stays
      // valid (Salesforce does not assert it on a frontdoor login), but nobody
      // can ever use it again, and only 'force' can replace it.
      this.browserforce.logger?.warn(
        `no 'credentialFile' configured: the Credential of ${registrationIds[0]} is discarded and this Registration can never be recognized as ours again`,
      );
      return;
    }
    await writeCredentialFile(credentialFile, {
      rpId: this.getRpId(),
      registrationId: registrationIds[0],
      credential: credentials[0],
    });
    this.browserforce.logger?.log(`saved the Credential to '${credentialFile}' (⚠️ contains a private key)`);
  }

  /**
   * When the org does not force enrollment at login, the Registration has to be
   * created from the user detail page. While the user has no Registration, this
   * goes straight to the create ceremony without an assertion step-up.
   */
  private async openVoluntaryEnrollment(page: Page): Promise<void> {
    const instanceUrl = this.browserforce.getInstanceUrl();
    await page.goto(`${instanceUrl}${await this.getUserDetailPath()}`);
    await page.locator(CLASSIC_PAGE_BLOCK).first().waitFor();
    const registerLink = page.locator(REGISTER_LINK).last();
    if (!(await registerLink.count())) {
      throw new Error(
        `could not find a link to register a passkey on the user detail page. Does this user have permission to manage its own Built-in Authenticators?`,
      );
    }
    await registerLink.click();
    await page.getByRole('button', { name: CREATE_PASSKEY_BUTTON }).waitFor();
  }

  private async deleteRegistrations(registrationIds: string[]): Promise<void> {
    for (const registrationId of registrationIds) {
      await this.deleteRegistration(registrationId);
      this.browserforce.logger?.log(`deleted the passkey Registration ${registrationId}`);
    }
  }

  private async deleteRegistration(registrationId: string): Promise<void> {
    await using page = await this.browserforce.openPage(await this.getUserDetailPath());
    await page.locator(CLASSIC_PAGE_BLOCK).first().waitFor();
    const deleteLink = page.locator(`a[href*="delID=${registrationId}"]`);
    if ((await deleteLink.count()) !== 1) {
      throw new Error(
        `expected exactly one delete link for the passkey Registration ${registrationId}, but found ${await deleteLink.count()}`,
      );
    }
    // guard against deleting the wrong record (see poc/README.md)
    parseRegistrationId(await deleteLink.getAttribute('href'));
    page.on('dialog', (dialog) => dialog.accept());
    await deleteLink.click();
    // the page navigates back to the user detail view even when nothing was
    // deleted, so verify against the server instead of trusting the navigation
    await waitUntil(async () => !(await this.getRegistrationIds()).includes(registrationId), {
      timeoutMs: DELETION_TIMEOUT_MS,
      description: `the passkey Registration ${registrationId} to be gone`,
    });
  }
}

/**
 * Polls until the action returns something other than undefined or false.
 * Errors are retried, because the pages involved briefly redirect while
 * Salesforce settles a passkey change.
 */
async function waitUntil<T>(
  action: () => Promise<T | undefined | false>,
  options: { timeoutMs: number; description: string },
): Promise<T> {
  const deadline = Date.now() + options.timeoutMs;
  let lastError: unknown;
  do {
    try {
      const result = await action();
      if (result !== undefined && result !== false) {
        return result;
      }
      lastError = undefined;
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  } while (Date.now() < deadline);
  throw new Error(`Timed out after ${options.timeoutMs}ms waiting for ${options.description}`, {
    cause: lastError instanceof Error ? lastError : undefined,
  });
}
