import { core } from '@salesforce/command';
import * as puppeteer from 'puppeteer';

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
    const instanceUrl = this.getInstanceUrl();
    const response = await this.page.goto(
      `${instanceUrl}/secur/frontdoor.jsp?sid=${
        this.org.getConnection().accessToken
      }&retURL=${encodeURIComponent(PERSONAL_INFORMATION_PATH)}`,
      { waitUntil: ['load', 'domcontentloaded', 'networkidle0'] }
    );
    const errorHandle = await this.page.$(ERROR_DIV_SELECTOR);
    if (errorHandle) {
      const errorMsg = await this.page.evaluate(div => div.innerText, errorHandle);
      if (errorMsg) {
        throw new Error(`login failed: ${errorMsg}`);
      }
    }
    if (response) {
      if (response.status() === 500) {
        throw new Error(`login failed [500]: ${response.statusText()}`);
      }
      if (response.url().indexOf('/?ec=302') > 0) {
        throw new Error(
          `login failed [302]: {"instanceUrl": "${instanceUrl}, "url": "${response
            .url()
            .split('/')
            .slice(0, 3)
            .join('/')}"}"`
        );
      }
      return this;
    } else {
      throw new Error('login failed');
    }
  }

  public async logout() {
    await this.page.close();
    await this.browser.close();
    return this;
  }

  public getInstanceUrl() {
    return this.org.getConnection().instanceUrl;
  }
}
