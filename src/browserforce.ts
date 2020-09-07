import { core } from '@salesforce/command';
import pRetry, { AbortError } from 'p-retry';
import * as puppeteer from 'puppeteer';
import * as querystring from 'querystring';
import { parse, URL } from 'url';

const POST_LOGIN_PATH = 'setup/forcecomHomepage.apexp';

const ERROR_DIV_SELECTOR = '#errorTitle';
const ERROR_DIVS_SELECTOR = 'div.errorMsg';
const VF_IFRAME_SELECTOR = 'iframe[name^=vfFrameId]';

export default class Browserforce {
  public org: core.Org;
  public logger: core.Logger;
  public browser: puppeteer.Browser;
  public page: puppeteer.Page;
  constructor(org, logger?) {
    this.org = org;
    this.logger = logger;
  }

  public async login() {
    this.browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: !(process.env.BROWSER_DEBUG === 'true')
    });
    await this.openPage(
      `secur/frontdoor.jsp?sid=${
        this.org.getConnection().accessToken
      }&retURL=${encodeURIComponent(POST_LOGIN_PATH)}`,
      { waitUntil: ['load', 'domcontentloaded', 'networkidle0'] }
    );
    return this;
  }

  public async logout() {
    await this.browser.close();
    return this;
  }

  public async resolveDomains() {
    // resolve ip addresses of both LEX and classic domains
    const salesforceUrls = [
      this.getInstanceUrl(),
      this.getLightningUrl()
    ].filter(u => u);
    for (const salesforceUrl of salesforceUrls) {
      const resolver = await core.MyDomainResolver.create({
        url: new URL(salesforceUrl)
      });
      await resolver.resolve();
    }
  }

  public async throwPageErrors(page) {
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
        .map(m => m.trim())
        .join(' ')
        .trim();
      if (errorMsg) {
        throw new Error(errorMsg);
      }
    }
  }

  // path instead of url
  public async openPage(urlPath, options?) {
    const result = await pRetry(
      async () => {
        await this.resolveDomains();
        const page = await this.browser.newPage();
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
            ].filter(u => u);
            if (
              salesforceUrls.some(salesforceUrl =>
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
              urlPath = querystring.parse(parsedUrl.query).retURL;
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
        onFailedAttempt: error => {
          if (this.logger) {
            this.logger.warn(
              `retrying ${error.retriesLeft} more time(s) because of "${error}"`
            );
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
  // Wait for either the selectorOrFunctionOrTimeout in the page or the selectorOrFunctionOrTimeout in the iframe.
  // returns the page or the frame
  public async waitForInFrameOrPage(page, selectorOrFunctionOrTimeout) {
    await Promise.race([
      page.waitFor(selectorOrFunctionOrTimeout),
      page.waitFor(VF_IFRAME_SELECTOR)
    ]);
    const frameOrPage =
      (await page.frames().find(f => f.name().startsWith('vfFrameId'))) || page;
    await frameOrPage.waitFor(selectorOrFunctionOrTimeout);
    return frameOrPage;
  }

  public getMyDomain() {
    const instanceUrl = this.getInstanceUrl();
    // acme.my.salesforce.com
    // acme--<sandboxName>.csN.my.salesforce.com
    const matches = instanceUrl.match(/https\:\/\/(.*)\.my\.salesforce\.com/);
    if (matches) {
      return matches[1].split('.')[0];
    }
    return null;
  }

  public getInstanceDomain() {
    const instanceUrl = this.getInstanceUrl();
    // csN.salesforce.com
    // acme--<sandboxName>.csN.my.salesforce.com
    // NOT: test.salesforce.com login.salesforce.com
    const matches = instanceUrl.match(/https\:\/\/(.*)\.salesforce\.com/);
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

  public getInstanceUrl() {
    // sometimes the instanceUrl includes a trailing slash
    return this.org.getConnection().instanceUrl?.replace(/\/$/, '');
  }

  public getLightningUrl() {
    const myDomain = this.getMyDomain();
    const instanceDomain = this.getInstanceDomain();
    const myDomainOrInstance = myDomain || instanceDomain;
    if (myDomainOrInstance) {
      return `https://${myDomainOrInstance}.lightning.force.com`;
    }
    return null;
  }
}
