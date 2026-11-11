import { setTimeout as sleep } from 'node:timers/promises';
import type { Page } from 'playwright';
import { type SalesforceUrlPath } from '../../browserforce.js';
import { waitForPageErrors } from '../../page-errors.js';

// shown again on every visit until Call Summaries is turned on
export const GET_STARTED_BUTTON = 'lightning-button.feature-page__enhanced-page-cta button';
// disabled while a prerequisite listed above it is still being turned on
export const TURN_ON_BUTTON = 'setup_discovery-feature-enablement-panel [slot=action] button';
// shown instead of Turn On once Call Summaries was turned on, even while Salesforce is still finishing it
export const ON_BADGE =
  'setup_discovery-feature-enablement-panel lightning-badge.feature-enablement-panel__enabled-badge';
const CONFIRM_MODAL = 'lightning-modal';
const CONFIRM_TURN_ON_BUTTON = 'lightning-modal lightning-button.enable-feature-modal__confirm-button button';

// the Salesforce Go page takes a while to render
const PAGE_TIMEOUT_MS = 90_000;

// Einstein Conversation Insights can still be turning on in a new org, which keeps Turn On disabled.
// The page does not update by itself when that finishes, so it is reloaded until then.
const PREREQUISITES_TIMEOUT_MS = 30 * 60_000;
const PREREQUISITES_RELOAD_INTERVAL_MS = 30_000;

const MSG_PREREQUISITES_NOT_COMPLETED = `Call Summaries cannot be turned on: its prerequisites in Setup > Salesforce Go > Call Summaries were not completed within ${PREREQUISITES_TIMEOUT_MS / 60_000} minutes.
Please make sure Einstein Conversation Insights and Einstein Generative AI are turned on in this organization.`;

export class CallSummariesSetupPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public static getUrl(): SalesforceUrlPath {
    return '/lightning/setup/page/feature/sales-cloud-call-summaries/home';
  }

  /**
   * Get Started -> Turn On -> confirm Turn On in the modal
   */
  public async turnOn(): Promise<void> {
    if ((await this.waitUntilReady()) === 'alreadyOn') {
      return;
    }
    await this.page.locator(TURN_ON_BUTTON).click();
    await Promise.race([this.page.locator(CONFIRM_TURN_ON_BUTTON).waitFor(), waitForPageErrors(this.page)]);
    await this.page.locator(CONFIRM_TURN_ON_BUTTON).click();
    await Promise.race([this.page.locator(CONFIRM_MODAL).waitFor({ state: 'detached' }), waitForPageErrors(this.page)]);
  }

  /**
   * Clicks Get Started when shown, then waits until Turn On is enabled or the On badge is shown
   */
  private async waitUntilReady(): Promise<'alreadyOn' | 'canTurnOn'> {
    const getStartedButton = this.page.locator(GET_STARTED_BUTTON);
    const turnOnButton = this.page.locator(TURN_ON_BUTTON);
    const onBadge = this.page.locator(ON_BADGE);
    const deadline = Date.now() + PREREQUISITES_TIMEOUT_MS;
    while (true) {
      await Promise.race([
        getStartedButton.or(turnOnButton).or(onBadge).first().waitFor({ timeout: PAGE_TIMEOUT_MS }),
        waitForPageErrors(this.page),
      ]);
      if (await getStartedButton.isVisible()) {
        await getStartedButton.click();
        await Promise.race([
          turnOnButton.or(onBadge).first().waitFor({ timeout: PAGE_TIMEOUT_MS }),
          waitForPageErrors(this.page),
        ]);
      }
      if (await onBadge.isVisible()) {
        return 'alreadyOn';
      }
      if (await turnOnButton.isEnabled()) {
        return 'canTurnOn';
      }
      if (Date.now() + PREREQUISITES_RELOAD_INTERVAL_MS > deadline) {
        throw new Error(MSG_PREREQUISITES_NOT_COMPLETED);
      }
      // there is no signal on the page to wait for: Salesforce finishes the prerequisites in the background
      await sleep(PREREQUISITES_RELOAD_INTERVAL_MS);
      await this.page.reload();
    }
  }
}
