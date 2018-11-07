import { core } from '@salesforce/command';
import * as puppeteer from 'puppeteer';

export default class Browserforce {
  public org: core.Org;
  public browser: puppeteer.Browser;
  constructor(org) {
    this.org = org;
  }

  public async login() {
    this.browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: !(process.env.BROWSER_DEBUG === 'true')
    });
    const page = await this.browser.newPage();
    await page.setViewport({ width: 1024, height: 768 });
    const personalInformationPath =
      'setup/personalInformationSetup.apexp?nooverride=1';
    await page.goto(
      `${this.org.getConnection().instanceUrl}/secur/frontdoor.jsp?sid=${
        this.org.getConnection().accessToken
      }&retURL=${personalInformationPath}`
    );
    await page.waitForNavigation();
    const url = await page.url();
    if (!url.endsWith(personalInformationPath)) {
      await page.close();
      throw new Error('login failed');
    }
    await page.close();
    return this;
  }

  public async logout() {
    await this.browser.close();
    return this;
  }
}
