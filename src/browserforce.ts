import { core } from '@salesforce/command';
import * as puppeteer from 'puppeteer';
import { URL } from 'url';
import { retry } from './plugins/utils';

class FrontdoorRedirectError extends Error {}
class LoginError extends Error {}
class RetryableError extends Error {}

const PERSONAL_INFORMATION_PATH =
  'setup/personalInformationSetup.apexp?nooverride=1';

const ERROR_DIV_SELECTOR = '#errorTitle';
const ERROR_DIVS_SELECTOR = 'div.errorMsg';

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
    await this.retryLogin(
      `secur/frontdoor.jsp?sid=${
        this.org.getConnection().accessToken
      }&retURL=${encodeURIComponent(PERSONAL_INFORMATION_PATH)}`
    );
    return this;
  }

  public async logout() {
    await this.browser.close();
    return this;
  }

  public async resolveDomains() {
    // resolve ip addresses of both LEX and classic domains
    for (const url of [this.getInstanceUrl(), this.getLightningUrl()]) {
      const resolver = await core.MyDomainResolver.create({
        url: new URL(url)
      });
      await resolver.resolve();
    }
  }

  public async throwResponseErrors(response) {
    if (!response) {
      throw new Error('no response');
    }
    if (!response.ok()) {
      throw new RetryableError(
        `${response.status()}: ${response.statusText()}`
      );
    }
    if (response.url().indexOf('/?ec=302') > 0) {
      if (
        !response.url().startsWith(this.getInstanceUrl()) &&
        !response.url().startsWith(this.getLightningUrl())
      ) {
        const redactedUrl = response
          .url()
          .replace(/sid=(.*)/, 'sid=<REDACTED>')
          .replace(/sid%3D(.*)/, 'sid=<REDACTED>');
        throw new FrontdoorRedirectError(
          `expected instance or lightning URL but got: ${redactedUrl}`
        );
      }
      throw new LoginError('login failed');
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
    return await retry(
      async () => {
        try {
          await this.resolveDomains();
        } catch (error) {
          throw new RetryableError(error);
        }
        const page = await this.browser.newPage();
        page.setDefaultNavigationTimeout(
          parseInt(process.env.BROWSERFORCE_NAVIGATION_TIMEOUT_MS, 10) || 90000
        );
        await page.setViewport({ width: 1024, height: 768 });
        const url = `${this.getInstanceUrl()}/${urlPath}`;
        const response = await page.goto(url, options);
        await this.throwResponseErrors(response);
        // await this.throwPageErrors(page);
        return page;
      },
      5,
      4000,
      true,
      RetryableError.prototype,
      this.logger
    );
  }

  public getInstanceUrl() {
    return this.org.getConnection().instanceUrl;
  }

  private getLightningUrl() {
    const myDomain = this.getInstanceUrl().match(/https?\:\/\/([^.]*)/)[1];
    return `https://${myDomain}.lightning.force.com`;
  }

  private async retryLogin(
    loginUrl,
    refreshAuthLeft = 1,
    frontdoorWorkaroundLeft = 1
  ) {
    try {
      await this.openPage(loginUrl, {
        waitUntil: ['load', 'domcontentloaded', 'networkidle0']
      });
    } catch (err) {
      if (err instanceof LoginError && refreshAuthLeft > 0) {
        if (this.logger) {
          this.logger.warn(`retrying with refreshed auth because of "${err}"`);
        }
        await this.org.refreshAuth();
        await this.retryLogin(
          loginUrl,
          refreshAuthLeft - 1,
          frontdoorWorkaroundLeft
        );
      } else if (
        err instanceof FrontdoorRedirectError &&
        frontdoorWorkaroundLeft > 0
      ) {
        if (this.logger) {
          this.logger.warn(
            `retrying open page with instance url because of "${err}"`
          );
        }
        await this.retryLogin(
          PERSONAL_INFORMATION_PATH,
          refreshAuthLeft,
          frontdoorWorkaroundLeft - 1
        );
      } else {
        throw err;
      }
    }
  }
}
