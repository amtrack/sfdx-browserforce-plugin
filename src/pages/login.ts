import { type Org } from '@salesforce/core';
import { type Page } from 'playwright';

const FRONT_DOOR_PATH = 'secur/frontdoor.jsp';
const POST_LOGIN_PATH = 'setup/forcecomHomepage.apexp';

const ERROR_DIV_SELECTOR = '#error';

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
    const response = await this.page.goto(
      `${conn.instanceUrl.replace(/\/$/, '')}/${FRONT_DOOR_PATH}?sid=${
        conn.accessToken
      }&retURL=${encodeURIComponent(POST_LOGIN_PATH)}`,
      {
        waitUntil: 'load',
      }
    );
    const url = new URL(response.url());
    if (url.searchParams.has('startURL')) {
      // when query param startURL exists, the login failed
      // e.g. /?ec=302&startURL=https...
      await this.throwPageErrors();
    }
    return this;
  }

  async throwPageErrors(): Promise<void> {
    const errorLocator = this.page.locator(ERROR_DIV_SELECTOR);
    const errorCount = await errorLocator.count();
    
    if (errorCount > 0) {
      const errorMessage = (await errorLocator.first().innerText())?.trim();
      if (errorMessage) {
        throw new Error(errorMessage);
      }
    }
  }
}
