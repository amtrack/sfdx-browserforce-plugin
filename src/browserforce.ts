import { core } from '@salesforce/command';
import * as puppeteer from 'puppeteer';
import { URL } from 'url';

const PERSONAL_INFORMATION_PATH =
  'setup/personalInformationSetup.apexp?nooverride=1';

const ERROR_DIV_SELECTOR = '#errorTitle';

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
      const response = await this.goto(
        `secur/frontdoor.jsp?sid=${
          this.org.getConnection().accessToken
        }&retURL=${encodeURIComponent(PERSONAL_INFORMATION_PATH)}`,
        { waitUntil: ['load', 'domcontentloaded', 'networkidle0'] }
      );
      if (response) {
        if (response.status() === 500) {
          throw new Error(`login failed [500]: ${response.statusText()}`);
        }
        if (response.url().indexOf('/?ec=302') > 0) {
          const redactedUrl = response.url().replace(/sid=(.*)/, 'sid=<REDACTED>');
          throw new Error(
            `login failed [302]: { "url": "${redactedUrl}`
          );
        }
        return this;
      } else {
        throw new Error('unkown reason');
      }
    } catch (err) {
      throw new Error(`login failed: ${err}`);
    }
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
    // resolve ip addresses of both LEX and classic URLs before logging in
    for (const url of [instanceUrl, lightningDomain]) {
      const resolver = await core.MyDomainResolver.create({
        url: new URL(url)
      });
      await resolver.resolve();
    }
  }

  public async checkForErrors() {
    const errorHandle = await this.page.$(ERROR_DIV_SELECTOR);
    if (errorHandle) {
      const errorMsg = await this.page.evaluate(div => div.innerText, errorHandle);
      if (errorMsg) {
        throw new Error(`${errorMsg}`);
      }
    }

  }

  // path instead of url
  public async goto(urlPath, options?) {
    await this.resolveDomains();
    const url = `${this.getInstanceUrl()}/${urlPath}`;
    return await this.page.goto(
      url,
      options
    );
  }

  public getInstanceUrl() {
    return this.org.getConnection().instanceUrl;
  }
}
