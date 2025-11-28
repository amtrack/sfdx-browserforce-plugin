import { Org } from '@salesforce/core';
import { type Ux } from '@salesforce/sf-plugins-core';
import pRetry from 'p-retry';
import {
  chromium,
  Browser,
  BrowserContext,
  Page,
  FrameLocator,
} from 'playwright';
import { LoginPage } from './pages/login.js';

const VF_IFRAME_SELECTOR = 'force-aloha-page iframe[name^=vfFrameId]';

export class Browserforce {
  public org: Org;
  public logger?: Ux;
  public browser: Browser;
  public context: BrowserContext;
  public page: Page;
  public lightningSetupUrl: string;

  constructor(org: Org, logger?: Ux) {
    this.org = org;
    this.logger = logger;
  }

  public async login(): Promise<Browserforce> {
    this.browser = await chromium.launch({
      channel: process.env.CI ? 'chrome' : undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: !(process.env.BROWSER_DEBUG === 'true'),
      slowMo: parseInt(process.env.BROWSER_SLOWMO, 10) ?? 0,
    });
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 1536 },
    });

    // Start tracing if PLAYWRIGHT_TRACE is set
    if (process.env.PLAYWRIGHT_TRACE === 'true') {
      await this.context.tracing.start({
        screenshots: true,
        snapshots: true,
        sources: true,
      });
    }
    const page = await this.getNewPage();
    try {
      const loginPage = new LoginPage(page);
      await loginPage.login(this.org);
    } finally {
      await page.close();
    }
    return this;
  }

  public async logout(): Promise<Browserforce> {
    if (this.browser) {
      // Stop tracing and save if it was started
      if (process.env.PLAYWRIGHT_TRACE === 'true') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const tracePath = `trace-${timestamp}.zip`;
        await this.context.tracing.stop({ path: tracePath });
        if (this.logger) {
          this.logger.log(`Playwright trace saved to: ${tracePath}`);
        }
      }
      await this.browser.close();
    }
    return this;
  }

  public async getNewPage(): Promise<Page> {
    const page = await this.context.newPage();
    page.setDefaultNavigationTimeout(
      parseInt(process.env.BROWSERFORCE_NAVIGATION_TIMEOUT_MS ?? '90000', 10)
    );
    return page;
  }

  // path instead of url
  public async openPage(urlPath: string): Promise<Page> {
    let page: Page;
    const result = await pRetry(
      async () => {
        page = await this.getNewPage();
        const setupUrl = urlPath.startsWith('lightning')
          ? await this.getLightningSetupUrl()
          : this.getInstanceUrl();
        const url = `${setupUrl}/${urlPath}`;
        const response = await page.goto(url);
        if (response && !response.ok()) {
          await Promise.race([
            waitForPageErrors(page, 5_000),
            (async () => {
              await page.waitForTimeout(10_000);
              throw new Error(`${response.status()}: ${response.statusText()}`);
            })(),
          ]);
        }
        return page;
      },
      {
        onFailedAttempt: async (context) => {
          if (this.logger) {
            this.logger.warn(
              `retrying ${context.retriesLeft} more time(s) because of "${context.error}"`
            );
          }
          if (page) {
            try {
              await page.close();
            } catch (e) {
              // not handled
            }
          }
        },
        retries: parseInt(
          process.env.BROWSERFORCE_RETRY_MAX_RETRIES ?? '4',
          10
        ),
        minTimeout: parseInt(
          process.env.BROWSERFORCE_RETRY_TIMEOUT_MS ?? '4000',
          10
        ),
      }
    );
    return result;
  }

  // If LEX is enabled, the classic url will be opened in an iframe.
  // Wait for either the selector in the page or in the iframe.
  // returns the page or the frame locator
  public async waitForSelectorInFrameOrPage(
    page: Page,
    selector: string
  ): Promise<Page | FrameLocator> {
    await page.locator(`${selector}, ${VF_IFRAME_SELECTOR}`).first().waitFor();

    const iframeCount = await page.locator(VF_IFRAME_SELECTOR).count();

    if (iframeCount > 0) {
      const frameLocator = page.frameLocator(VF_IFRAME_SELECTOR);
      await frameLocator.locator(selector).first().waitFor();
      return frameLocator;
    }

    await page.locator(selector).first().waitFor();
    return page;
  }

  public getMyDomain(): string | null {
    const instanceUrl = this.getInstanceUrl();
    // acme.my.salesforce.com
    // acme--<sandboxName>.csN.my.salesforce.com
    const matches = instanceUrl.match(/https:\/\/(.*)\.my\.salesforce\.com/);
    if (matches) {
      return matches[1];
    }
    return null;
  }

  public getInstanceUrl(): string {
    // sometimes the instanceUrl includes a trailing slash
    return this.org.getConnection().instanceUrl?.replace(/\/$/, '');
  }

  /**
   * @returns the setup url (e.g. https://[MyDomainName].my.salesforce-setup.com)
   */
  public async getLightningSetupUrl(): Promise<string> {
    if (!this.lightningSetupUrl) {
      const page = await this.getNewPage();
      try {
        const lightningResponse = await page.goto(
          `${this.getInstanceUrl()}/lightning/setup/SetupOneHome/home`
        );
        this.lightningSetupUrl = new URL(lightningResponse.url()).origin;
      } finally {
        await page.close();
      }
    }
    return this.lightningSetupUrl;
  }
}

export async function waitForPageErrors(
  page: Page,
  timeout = 90_000
): Promise<void> {
  const anyErrorsLocator = page.locator(
    `#error, #errorTitle, #errorDesc, #validationError, div.errorMsg`
  );
  await anyErrorsLocator.first().waitFor({ state: 'attached', timeout });
  const errorMessages = (await anyErrorsLocator.allInnerTexts())
    .map((t) => t.trim())
    .filter(Boolean);
  if (errorMessages.length === 1) {
    throw new Error(errorMessages[0]);
  } else if (errorMessages.length > 1) {
    throw new Error(errorMessages.join('\n'));
  }
}

export async function retry<T>(
  input: (attemptCount: number) => PromiseLike<T> | T
): Promise<T> {
  const res = await pRetry(input, {
    onFailedAttempt: (context) => {
      console.warn(
        `retrying ${context.retriesLeft} more time(s) because of "${context.error}"`
      );
    },
    retries: parseInt(process.env.BROWSERFORCE_RETRY_MAX_RETRIES ?? '6', 10),
    minTimeout: parseInt(
      process.env.BROWSERFORCE_RETRY_TIMEOUT_MS ?? '4000',
      10
    ),
  });
  return res;
}
