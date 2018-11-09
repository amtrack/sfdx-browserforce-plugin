import { core } from '@salesforce/command';
import * as puppeteer from 'puppeteer';

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
    const personalInformationPath =
      'setup/personalInformationSetup.apexp?nooverride=1';
    await this.page.goto(
      `${
        this.org.getConnection().instanceUrl
      }/secur/frontdoor.jsp?sid=${encodeURIComponent(
        this.org.getConnection().accessToken
      )}&retURL=${encodeURIComponent(personalInformationPath)}`
    );
    await this.page.waitForNavigation();
    const url = await this.page.url();
    if (!url.endsWith(personalInformationPath)) {
      throw new Error('login failed');
    }
    return this;
  }

  public async logout() {
    await this.page.close();
    await this.browser.close();
    return this;
  }
}
