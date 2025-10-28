import { Org } from '@salesforce/core';
import { type Ux } from '@salesforce/sf-plugins-core';
import pRetry from 'p-retry';
import { chromium, Browser, BrowserContext, Page, FrameLocator } from 'playwright';
import { LoginPage } from './pages/login.js';

const ERROR_DIV_SELECTOR = '#errorTitle';
const ERROR_DIVS_SELECTOR = 'div.errorMsg';
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
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
      headless: !(process.env.BROWSER_DEBUG === 'true'),
      slowMo: parseInt(process.env.BROWSER_SLOWMO, 10) ?? 0,
    });
    this.context = await this.browser.newContext({
      viewport: { width: 1024, height: 768 },
    });
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
      await this.browser.close();
    }
    return this;
  }

  public async throwPageErrors(page: Page): Promise<void> {
    await throwPageErrors(page);
  }

  public async getNewPage(): Promise<Page> {
    const page = await this.context.newPage();
    page.setDefaultNavigationTimeout(
      parseInt(process.env.BROWSERFORCE_NAVIGATION_TIMEOUT_MS ?? '90000', 10)
    );
    return page;
  }

  // path instead of url
  public async openPage(
    urlPath: string,
    options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit' }
  ): Promise<Page> {
    let page: Page;
    const result = await pRetry(
      async () => {
        page = await this.getNewPage();
        const setupUrl = urlPath.startsWith('lightning')
          ? await this.getLightningSetupUrl()
          : this.getInstanceUrl();
        const url = `${setupUrl}/${urlPath}`;
        const response = await page.goto(url, options ?? { waitUntil: 'load' });
        if (response) {
          if (!response.ok()) {
            await this.throwPageErrors(page);
            throw new Error(`${response.status()}: ${response.statusText()}`);
          }
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
      await frameLocator.locator(selector).waitFor();
      return frameLocator;
    }
    
    await page.locator(selector).waitFor();
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
          `${this.getInstanceUrl()}/lightning/setup/SetupOneHome/home`,
          { waitUntil: 'load' }
        );
        this.lightningSetupUrl = new URL(lightningResponse.url()).origin;
      } finally {
        await page.close();
      }
    }
    return this.lightningSetupUrl;
  }
}

export async function throwPageErrors(page: Page): Promise<void> {
  const errorLocator = page.locator(ERROR_DIV_SELECTOR);
  const errorCount = await errorLocator.count();
  
  if (errorCount > 0) {
    const errorMsg = await errorLocator.first().innerText();
    if (errorMsg && errorMsg.trim()) {
      throw new Error(errorMsg.trim());
    }
  }
  
  const errorDivsLocator = page.locator(ERROR_DIVS_SELECTOR);
  const errorDivsCount = await errorDivsLocator.count();
  
  if (errorDivsCount > 0) {
    const errorMessages: string[] = [];
    for (let i = 0; i < errorDivsCount; i++) {
      const text = await errorDivsLocator.nth(i).innerText();
      errorMessages.push(text);
    }
    const errorMsg = errorMessages
      .map((m) => m.trim())
      .join(' ')
      .trim();
    if (errorMsg) {
      throw new Error(errorMsg);
    }
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
