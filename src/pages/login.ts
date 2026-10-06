import { Org, type Connection } from '@salesforce/core';
import { type Page } from 'playwright';
import { waitForPageErrors } from '../page-errors.js';

const POST_LOGIN_PATH = '/setup/forcecomHomepage.apexp';
const MAINTENANCE_PATH = '/msg/maintenanceandavailable.jsp';
const MAX_MAINTENANCE_REDIRECTS = 5;

export class LoginPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async login(connection: Connection) {
    const org = await Org.create({ connection });
    const frontDoorUrl = await org.getFrontDoorUrl(POST_LOGIN_PATH);
    await this.page.goto(frontDoorUrl);

    // The maintenance interstitial can be served again on the next hop.
    // Bypass it after every navigation until setup home is reached.
    let maintenanceRedirects = 0;
    while (true) {
      const currentUrl = new URL(this.page.url());
      if (currentUrl.pathname === MAINTENANCE_PATH) {
        maintenanceRedirects += 1;
        if (maintenanceRedirects > MAX_MAINTENANCE_REDIRECTS) {
          throw new Error(`Login remained on ${MAINTENANCE_PATH} after ${MAX_MAINTENANCE_REDIRECTS} redirects`);
        }
        await this.page.goto(currentUrl.origin + POST_LOGIN_PATH);
        continue;
      }

      await Promise.race([
        this.page.waitForURL((url) => url.pathname === POST_LOGIN_PATH || url.pathname === MAINTENANCE_PATH),
        waitForPageErrors(this.page),
      ]);

      if (new URL(this.page.url()).pathname === POST_LOGIN_PATH) {
        return this;
      }
    }
  }
}
