import { Org, type Connection } from '@salesforce/core';
import { type Page } from 'playwright';
import { waitForPageErrors } from '../browserforce.js';

const POST_LOGIN_PATH = '/setup/forcecomHomepage.apexp';

export class LoginPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async login(connection: Connection) {
    const org = await Org.create({ connection });
    const frontDoorUrl = await org.getFrontDoorUrl(POST_LOGIN_PATH);
    await this.page.goto(frontDoorUrl);
    const currentUrl = new URL(this.page.url());
    if (currentUrl.pathname === '/msg/maintenanceandavailable.jsp') {
      await this.page.goto(currentUrl.origin + POST_LOGIN_PATH);
    }
    await Promise.race([this.page.waitForURL((url) => url.pathname === POST_LOGIN_PATH), waitForPageErrors(this.page)]);
    return this;
  }
}
