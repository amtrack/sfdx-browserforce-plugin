import { SalesforceId } from 'jsforce';
import { BrowserforcePlugin } from '../../../plugin';

const PATHS = {
  EDIT_VIEW: 'setup/secur/idp/IdpPage.apexp'
};
const SELECTORS = {
  CHOOSE_CERT: 'select[id$=":chooseCert"]',
  DISABLE_BUTTON: 'input[name$=":disable"]',
  EDIT_BUTTON: 'input[name$=":edit"]',
  SAVE_BUTTON: 'input[name$=":save"]'
};

interface CertificateRecord {
  Id: SalesforceId;
  DeveloperName: string;
  NamespacePrefix: string;
}

export default class IdentityProvider extends BrowserforcePlugin {
  public async retrieve(definition?) {
    const page = this.browserforce.page;
    await page.goto(`${this.browserforce.getInstanceUrl()}/${PATHS.EDIT_VIEW}`);
    await page.waitFor(SELECTORS.EDIT_BUTTON);
    const disableButton = await page.$(SELECTORS.DISABLE_BUTTON);
    return {
      enabled: disableButton !== null,
      certificate: null
    };
  }

  public async apply(plan) {
    const page = this.browserforce.page;
    await page.goto(`${this.browserforce.getInstanceUrl()}/${PATHS.EDIT_VIEW}`);
    await page.waitFor(SELECTORS.EDIT_BUTTON);
    if (plan.enabled) {
      const certsResponse = await this.org
        .getConnection()
        .tooling.query<CertificateRecord>(
          `SELECT Id, DeveloperName FROM Certificate WHERE DeveloperName = '${
            plan.certificate
          }'`
        );
      if (!certsResponse.records.length) {
        throw new Error(`Could not find Certificate '${plan.certificate}'`);
      }
      const cert = certsResponse.records[0];
      await Promise.all([
        page.waitForNavigation(),
        page.click(SELECTORS.EDIT_BUTTON)
      ]);
      await page.waitFor(SELECTORS.CHOOSE_CERT);
      await page.select(SELECTORS.CHOOSE_CERT, cert.Id.substring(0, 15));
      page.on('dialog', async dialog => {
        await dialog.accept();
      });
      await page.waitFor(SELECTORS.SAVE_BUTTON);
      await Promise.all([
        page.waitForNavigation(),
        page.click(SELECTORS.SAVE_BUTTON)
      ]);
    } else {
      await page.$(SELECTORS.DISABLE_BUTTON);
      await Promise.all([
        page.waitForNavigation(),
        page.click(SELECTORS.DISABLE_BUTTON)
      ]);
    }
  }
}
