import { type Connection } from '@salesforce/core';
import { type Ux } from '@salesforce/sf-plugins-core';
import pRetry, { Options as RetryOptions } from 'p-retry';
import { type BrowserContext, type FrameLocator, type Page } from 'playwright';
import { LoginPage } from './pages/login.js';

const VF_IFRAME_SELECTOR = 'force-aloha-page iframe[name^=vfFrameId]';

export type SalesforceUrlPath = `/${string}`;

export type BrowserforceOptions = {
  logger?: Ux;
  retry?: RetryOptions;
};

export class Browserforce {
  public connection: Connection;
  public browserContext: BrowserContext;
  public logger?: Ux;
  private lightningSetupUrl: string;
  private retryConfig?: RetryOptions;

  constructor(connection: Connection, browserContext: BrowserContext, options?: BrowserforceOptions) {
    this.connection = connection;
    this.browserContext = browserContext;
    this.logger = options?.logger;
    this.retryConfig = options?.retry ?? {
      retries: 0,
    };
  }

  public async login(): Promise<Browserforce> {
    try {
      await this.connection.refreshAuth();
    } catch (e) {
      throw new Error('login failed', { cause: e });
    }
    await using page = await this.browserContext.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.login(this.connection);
    return this;
  }

  // path instead of url
  public async openPage(urlPath: SalesforceUrlPath): Promise<Page> {
    let page: Page;
    const result = await this.retry(async () => {
      page = await this.browserContext.newPage();
      const setupUrl = urlPath.startsWith('/lightning') ? await this.getLightningSetupUrl() : this.getInstanceUrl();
      const url = `${setupUrl}${urlPath}`;
      const response = await page.goto(url);
      if (response && !response.ok()) {
        await Promise.race([
          (async () => {
            await page.waitForTimeout(5_000);
            throw new Error(`${response.status()}: ${response.url()}`);
          })(),
          waitForPageErrors(page, 6_000),
        ]);
      }
      return page;
    });
    return result;
  }

  // If LEX is enabled, the classic url will be opened in an iframe.
  // Wait for either the selector in the page or in the iframe.
  // returns the page or the frame locator
  public async waitForSelectorInFrameOrPage(page: Page, selector: string): Promise<Page | FrameLocator> {
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
    return this.connection.instanceUrl?.replace(/\/$/, '');
  }

  /**
   * @returns the setup url (e.g. https://[MyDomainName].my.salesforce-setup.com)
   */
  public async getLightningSetupUrl(): Promise<string> {
    if (!this.lightningSetupUrl) {
      await using page = await this.browserContext.newPage();
      const lightningResponse = await page.goto(`${this.getInstanceUrl()}/lightning/setup/SetupOneHome/home`);
      this.lightningSetupUrl = new URL(lightningResponse.url()).origin;
    }
    return this.lightningSetupUrl;
  }

  public async retry<T>(input: (attemptCount: number) => PromiseLike<T> | T): Promise<T> {
    const res = await pRetry(input, {
      ...this.retryConfig,
      onFailedAttempt: (context) => {
        this.logger?.warn(`retrying ${context.retriesLeft} more time(s) because of "${context.error}"`);
      },
    });
    return res;
  }
}

export async function waitForPageErrors(page: Page, timeout = 90_000): Promise<void> {
  const anyErrorsLocator = page.locator(`#error, #errorTitle, #errorDesc, #validationError, div.errorMsg`);
  await anyErrorsLocator.first().waitFor({ state: 'attached', timeout });
  const errorMessages = (await anyErrorsLocator.allInnerTexts()).map((t) => t.trim()).filter(Boolean);
  if (errorMessages.length === 1) {
    throw new Error(errorMessages[0]);
  } else if (errorMessages.length > 1) {
    throw new Error(errorMessages.join('\n'));
  }
}
