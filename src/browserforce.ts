import { Org } from '@salesforce/core';
import { type Ux } from '@salesforce/sf-plugins-core';
import pRetry from 'p-retry';
import { Browser, Frame, launch, Page, WaitForOptions } from 'puppeteer';
import { LoginPage } from './pages/login';

const ERROR_DIV_SELECTOR = '#errorTitle';
const ERROR_DIVS_SELECTOR = 'div.errorMsg';
const VF_IFRAME_SELECTOR = 'iframe[name^=vfFrameId]';

export class Browserforce {
  public org: Org;
  public logger?: Ux;
  public browser: Browser;
  public page: Page;
  constructor(org: Org, logger?: Ux) {
    this.org = org;
    this.logger = logger;
  }

  public async login(): Promise<Browserforce> {
    this.browser = await launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        // workaround for navigating frames https://github.com/puppeteer/puppeteer/issues/5123
        '--disable-features=site-per-process'
      ],
      headless: !(process.env.BROWSER_DEBUG === 'true')
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
    const page = await this.browser.newPage();
    page.setDefaultNavigationTimeout(parseInt(process.env.BROWSERFORCE_NAVIGATION_TIMEOUT_MS ?? '90000', 10));
    await page.setViewport({ width: 1024, height: 768 });
    return page;
  }

  // path instead of url
  public async openPage(urlPath: string, options?: WaitForOptions): Promise<Page> {
    let page: Page;
    const result = await pRetry(
      async () => {
        page = await this.getNewPage();
        const url = `${this.getInstanceUrl()}/${urlPath}`;
        const response = await page.goto(url, options);
        if (response) {
          if (!response.ok()) {
            await this.throwPageErrors(page);
            throw new Error(`${response.status()}: ${response.statusText()}`);
          }
        }
        return page;
      },
      {
        onFailedAttempt: async (error) => {
          if (this.logger) {
            this.logger.warn(`retrying ${error.retriesLeft} more time(s) because of "${error}"`);
          }
          if (page) {
            try {
              await page.close();
            } catch (e) {
              // not handled
            }
          }
        },
        retries: parseInt(process.env.BROWSERFORCE_RETRY_MAX_RETRIES ?? '4', 10),
        minTimeout: parseInt(process.env.BROWSERFORCE_RETRY_TIMEOUT_MS ?? '4000', 10)
      }
    );
    return result;
  }

  // If LEX is enabled, the classic url will be opened in an iframe.
  // Wait for either the selector in the page or in the iframe.
  // returns the page or the frame
  public async waitForSelectorInFrameOrPage(page: Page, selector: string): Promise<Page | Frame> {
    await page.waitForSelector(`pierce/${VF_IFRAME_SELECTOR}, ${selector}`);
    const frameElementHandle = await page.$(`pierce/${VF_IFRAME_SELECTOR}`);
    let frameOrPage: Page | Frame = page;
    if (frameElementHandle) {
      const frame = await page.waitForFrame(
        async (f) => f.name().startsWith('vfFrameId') && f.url()?.length > 0 && f.url() !== 'about:blank'
      );
      frameOrPage = frame;
    }
    await frameOrPage.waitForSelector(selector);
    return frameOrPage;
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
}

export async function throwPageErrors(page: Page): Promise<void> {
  const errorHandle = await page.$(ERROR_DIV_SELECTOR);
  if (errorHandle) {
    const errorMsg = await page.evaluate((div: HTMLDivElement) => div.innerText, errorHandle);
    await errorHandle.dispose();
    if (errorMsg && errorMsg.trim()) {
      throw new Error(errorMsg.trim());
    }
  }
  const errorElements = await page.$$(ERROR_DIVS_SELECTOR);
  if (errorElements.length) {
    const errorMessages = await page.evaluate(
      (...errorDivs) => {
        return errorDivs.map((div: HTMLDivElement) => div.innerText);
      },
      ...errorElements
    );
    const errorMsg = errorMessages
      .map((m) => m.trim())
      .join(' ')
      .trim();
    if (errorMsg) {
      throw new Error(errorMsg);
    }
  }
}

export async function retry<T>(input: (attemptCount: number) => PromiseLike<T> | T): Promise<T> {
  const res = await pRetry(input, {
    onFailedAttempt: (error) => {
      console.warn(`retrying ${error.retriesLeft} more time(s) because of "${error}"`);
    },
    retries: parseInt(process.env.BROWSERFORCE_RETRY_MAX_RETRIES ?? '6', 10),
    minTimeout: parseInt(process.env.BROWSERFORCE_RETRY_TIMEOUT_MS ?? '4000', 10)
  });
  return res;
}
