import { type Connection } from '@salesforce/core';
import { type Page } from 'playwright';
import { waitForPageErrors } from '../browserforce.js';

const FRONT_DOOR_PATH = '/secur/frontdoor.jsp';
const POST_LOGIN_PATH = '/setup/forcecomHomepage.apexp';

export class LoginPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async login(connection: Connection) {
    await this.page.goto(
      `${connection.instanceUrl.replace(/\/$/, '')}${FRONT_DOOR_PATH}?sid=${
        connection.accessToken
      }&retURL=${encodeURIComponent(POST_LOGIN_PATH)}`,
    );
    await Promise.race([this.page.waitForURL((url) => url.pathname === POST_LOGIN_PATH), waitForPageErrors(this.page)]);
    return this;
  }
}
