import { MyDomainResolver, Org } from '@salesforce/core';
import pRetry, { AbortError } from 'p-retry';
import { Browser, Frame, launch, Page, WaitForOptions } from 'puppeteer';
import * as querystring from 'querystring';
import { parse, URL } from 'url';

const POST_LOGIN_PATH = 'setup/forcecomHomepage.apexp';

const ERROR_DIV_SELECTOR = '#errorTitle';
const ERROR_DIVS_SELECTOR = 'div.errorMsg';
const VF_IFRAME_SELECTOR = 'iframe[name^=vfFrameId]';

export interface Logger {
  log(...args: string[]): unknown;
  warn(message: string): unknown;
  error(...args: unknown[]): unknown;
}

export class Browserforce {
  public org: Org;
  public logger: Logger;
  public browser: Browser;
  public page: Page;
  constructor(org: Org, logger?: Logger) {
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
    await this.openPage(
      `secur/frontdoor.jsp?sid=${
        this.org.getConnection().accessToken
      }&retURL=${encodeURIComponent(POST_LOGIN_PATH)}`
    );
    return this;
  }

  public async logout(): Promise<Browserforce> {
    await this.browser.close();
    return this;
  }

  public async resolveDomains(): Promise<void> {
    // resolve ip addresses of both LEX and classic domains
    const salesforceUrls = [
      this.getInstanceUrl(),
      this.getLightningUrl()
    ].filter((u) => u);
    for (const salesforceUrl of salesforceUrls) {
      const resolver = await MyDomainResolver.create({
        url: new URL(salesforceUrl)
      });
      await resolver.resolve();
    }
  }

  public async throwPageErrors(page: Page): Promise<void> {
    await throwPageErrors(page);
  }

  // path instead of url
  public async openPage(
    urlPath: string,
    options?: WaitForOptions
  ): Promise<Page> {
    let page;
    const result = await pRetry(
      async () => {
        await this.resolveDomains();
        page = await this.browser.newPage();
        page.setDefaultNavigationTimeout(
          parseInt(process.env.BROWSERFORCE_NAVIGATION_TIMEOUT_MS, 10) || 90000
        );
        await page.setViewport({ width: 1024, height: 768 });
        const url = `${this.getInstanceUrl()}/${urlPath}`;
        const parsedUrl = parse(urlPath);
        const response = await page.goto(url, options);
        if (response) {
          if (!response.ok()) {
            await this.throwPageErrors(page);
            throw new Error(`${response.status()}: ${response.statusText()}`);
          }
          if (response.url().indexOf('/?ec=302') > 0) {
            const salesforceUrls = [
              this.getInstanceUrl(),
              this.getLightningUrl()
            ].filter((u) => u);
            if (
              salesforceUrls.some((salesforceUrl) =>
                response.url().startsWith(salesforceUrl)
              )
            ) {
              // the url looks ok so it is a login error
              throw new AbortError('login failed');
            } else if (
              parsedUrl.pathname === 'secur/frontdoor.jsp' &&
              parsedUrl.query.includes('retURL=')
            ) {
              if (this.logger) {
                this.logger.warn('trying frontdoor workaround...');
              }
              // try opening page directly without frontdoor as login might have already been successful
              const qsUrl = querystring.parse(parsedUrl.query);
              urlPath = Array.isArray(qsUrl.retURL)
                ? qsUrl.retURL[0]
                : qsUrl.retURL;
              throw new Error('frontdoor error');
            } else {
              // the url is not as expected
              const redactedUrl = response
                .url()
                .replace(/sid=(.*)/, 'sid=<REDACTED>')
                .replace(/sid%3D(.*)/, 'sid=<REDACTED>');
              if (this.logger) {
                this.logger.warn(
                  `expected ${this.getInstanceUrl()} or ${this.getLightningUrl()} but got: ${redactedUrl}`
                );
                this.logger.warn('refreshing auth...');
              }
              await this.org.refreshAuth();
              throw new Error('redirection failed');
            }
          }
        }
        return page;
      },
      {
        onFailedAttempt: async (error) => {
          if (this.logger) {
            this.logger.warn(
              `retrying ${error.retriesLeft} more time(s) because of "${error}"`
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
        retries: process.env.BROWSERFORCE_RETRY_MAX_RETRIES
          ? parseInt(process.env.BROWSERFORCE_RETRY_MAX_RETRIES, 10)
          : 4,
        minTimeout: process.env.BROWSERFORCE_RETRY_TIMEOUT_MS
          ? parseInt(process.env.BROWSERFORCE_RETRY_TIMEOUT_MS, 10)
          : 4000
      }
    );
    return result;
  }

  // If LEX is enabled, the classic url will be opened in an iframe.
  // Wait for either the selector in the page or in the iframe.
  // returns the page or the frame
  public async waitForSelectorInFrameOrPage(
    page: Page,
    selector: string
  ): Promise<Page | Frame> {
    await page.waitForSelector(
      `pierce/force-aloha-page ${VF_IFRAME_SELECTOR}, ${VF_IFRAME_SELECTOR}, ${selector}`
    );
    const frameElementHandle = await page.$(
      `pierce/force-aloha-page ${VF_IFRAME_SELECTOR}, ${VF_IFRAME_SELECTOR}`
    );
    let frameOrPage: Page | Frame = page;
    if (frameElementHandle) {
      const frame = await frameElementHandle.contentFrame();
      if (frame) {
        frameOrPage = frame;
      }
    }
    await frameOrPage.waitForSelector(selector);
    return frameOrPage;
  }

  public getMyDomain(): string {
    const instanceUrl = this.getInstanceUrl();
    // acme.my.salesforce.com
    // acme--<sandboxName>.csN.my.salesforce.com
    const matches = instanceUrl.match(/https:\/\/(.*)\.my\.salesforce\.com/);
    if (matches) {
      return matches[1].split('.')[0];
    }
    return null;
  }

  public getInstanceDomain(): string {
    const instanceUrl = this.getInstanceUrl();
    // csN.salesforce.com
    // acme--<sandboxName>.csN.my.salesforce.com
    // NOT: test.salesforce.com login.salesforce.com
    const matches = instanceUrl.match(/https:\/\/(.*)\.salesforce\.com/);
    if (matches) {
      const parts = matches[1].split('.');
      if (parts.length === 3 && parts[2] === 'my') {
        return parts[1];
      } else if (!['test', 'login'].includes(parts[0])) {
        return parts[0];
      }
    }
    return null;
  }

  public getInstanceUrl(): string {
    // sometimes the instanceUrl includes a trailing slash
    return this.org.getConnection().instanceUrl?.replace(/\/$/, '');
  }

  public getLightningUrl(): string {
    const myDomain = this.getMyDomain();
    const instanceDomain = this.getInstanceDomain();
    const myDomainOrInstance = myDomain || instanceDomain;
    if (myDomainOrInstance) {
      return `https://${myDomainOrInstance}.lightning.force.com`;
    }
    return null;
  }
}

export async function throwPageErrors(page: Page): Promise<void> {
  const errorHandle = await page.$(ERROR_DIV_SELECTOR);
  if (errorHandle) {
    const errorMsg = await page.evaluate(
      (div: HTMLDivElement) => div.innerText,
      errorHandle
    );
    await errorHandle.dispose();
    if (errorMsg && errorMsg.trim()) {
      throw new Error(errorMsg.trim());
    }
  }
  const errorElements = await page.$$(ERROR_DIVS_SELECTOR);
  if (errorElements.length) {
    const errorMessages = await page.evaluate((...errorDivs) => {
      return errorDivs.map((div: HTMLDivElement) => div.innerText);
    }, ...errorElements);
    const errorMsg = errorMessages
      .map((m) => m.trim())
      .join(' ')
      .trim();
    if (errorMsg) {
      throw new Error(errorMsg);
    }
  }
}
