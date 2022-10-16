import { type Org } from '@salesforce/core';
import { type Page } from 'puppeteer';

const ERROR_DIV_SELECTOR = '#error';
const PATH = 'secur/frontdoor.jsp';
const POST_LOGIN_PATH = 'setup/forcecomHomepage.apexp';

export class LoginPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async login(org: Org) {
    try {
      await org.refreshAuth();
    } catch (_) {
      throw new Error('login failed');
    }
    const conn = org.getConnection();
    await this.page.goto(
      `${conn.instanceUrl}/${PATH}?sid=${conn.accessToken}&retURL=${encodeURIComponent(POST_LOGIN_PATH)}`,
      {
        // should have waited at least 500ms for network connections, redirects should probably have happened already
        waitUntil: ['load', 'networkidle2']
      }
    );
    const url = new URL(this.page.url());
    if (url.searchParams.has('startURL')) {
      // when query param startURL exists, the login failed
      // e.g. /?ec=302&startURL=https...
      await this.throwPageErrors();
    }
    return this;
  }

  async throwPageErrors(): Promise<void> {
    const errorHandle = await this.page.$(ERROR_DIV_SELECTOR);
    if (errorHandle) {
      const errorMessage = (await this.page.evaluate((div: HTMLDivElement) => div.innerText, errorHandle))?.trim();
      if (errorMessage) {
        throw new Error(errorMessage);
      }
    }
  }
}
