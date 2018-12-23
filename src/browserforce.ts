import { core } from '@salesforce/command';
import * as puppeteer from 'puppeteer';
import { URL } from 'url';
import { retry } from './plugins/utils';

class MyDomainError extends Error {}

const PERSONAL_INFORMATION_PATH =
  'setup/personalInformationSetup.apexp?nooverride=1';

const ERROR_DIV_SELECTOR = '#errorTitle';
const ERROR_DIVS_SELECTOR = 'div.errorMsg';

export default class Browserforce {
  public org: core.Org;
  public browser: puppeteer.Browser;
  public page: puppeteer.Page;
  constructor(org) {
    this.org = org;
  }

  public async login() {
    this.browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: !(process.env.BROWSER_DEBUG === 'true')
    });
    this.page = await this.browser.newPage();
    this.page.setDefaultNavigationTimeout(
      parseInt(process.env.BROWSERFORCE_NAVIGATION_TIMEOUT_MS, 10) || 90000
    );
    await this.page.setViewport({ width: 1024, height: 768 });
    try {
      await this.goto(
        `secur/frontdoor.jsp?sid=${
          this.org.getConnection().accessToken
        }&retURL=${encodeURIComponent(PERSONAL_INFORMATION_PATH)}`,
        { waitUntil: ['load', 'domcontentloaded', 'networkidle0'] }
      );
    } catch (err) {
      throw new Error(`login failed: ${err.message}`);
    }
    return this;
  }

  public async logout() {
    await this.page.close();
    await this.browser.close();
    return this;
  }

  public async resolveDomains() {
    const instanceUrl = this.getInstanceUrl();
    const myDomain = instanceUrl.match(/https?\:\/\/([^.]*)/)[1];
    const lightningDomain = `https://${myDomain}.lightning.force.com`;
    // resolve ip addresses of both LEX and classic URLs
    for (const url of [instanceUrl, lightningDomain]) {
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
      throw new Error(response.statusText());
    }
    if (response.url().indexOf('login.salesforce.com') > 0 || response.url().indexOf('test.salesforce.com') > 0) {
      const redactedUrl = response
        .url()
        .replace(/sid=(.*)/, 'sid=<REDACTED>')
        .replace(/sid%3D(.*)/, 'sid=<REDACTED>');
      await this.org.refreshAuth();
      throw new MyDomainError(`expected instance url but got: ${redactedUrl}`);
    }
    if (response.url().indexOf('/?ec=302') > 0) {
      throw new Error('unauthenticated');
    }
  }

  public async throwPageErrors() {
    const errorHandle = await this.page.$(ERROR_DIV_SELECTOR);
    if (errorHandle) {
      const errorMsg = await this.page.evaluate(
        (div: HTMLDivElement) => div.innerText,
        errorHandle
      );
      await errorHandle.dispose();
      if (errorMsg && errorMsg.trim()) {
        throw new Error(errorMsg.trim());
      }
    }
    const errorElements = await this.page.$$(ERROR_DIVS_SELECTOR);
    if (errorElements.length) {
      const errorMessages = await this.page.evaluate((...errorDivs) => {
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
  public async goto(urlPath, options?) {
    await this.resolveDomains();
    return await retry(
      async () => {
        const url = `${this.getInstanceUrl()}${urlPath}`;
        const response = await this.page.goto(url, options);
        await this.throwResponseErrors(response);
        // await this.throwPageErrors();
        return response;
      }, 5, 2000, true, 'MyDomainError');
  }

  public getInstanceUrl() {
    return this.org.getConnection().instanceUrl;
  }
}
