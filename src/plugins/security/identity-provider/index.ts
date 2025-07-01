import type { Record } from '@jsforce/jsforce-node';
import pRetry, { AbortError } from 'p-retry';
import { BrowserforcePlugin } from '../../../plugin.js';

const EDIT_VIEW_PATH = 'setup/secur/idp/IdpPage.apexp';

const CERTS_SELECT = 'select[id$=":chooseCert"]';
const CERT_NAME_SPAN_SELECTOR = 'span[id$="developer__name"';
const DISABLE_BUTTON_SELECTOR = 'input[name$=":disable"]';
const EDIT_BUTTON_SELECTOR = 'input[name$=":edit"]';
const SAVE_BUTTON_SELECTOR = 'input[name$=":save"]';

interface CertificateRecord extends Record {
  DeveloperName: string;
  NamespacePrefix: string;
}

export type Config = {
  enabled: boolean;
  certificate?: string;
};

export class IdentityProvider extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    const page = await this.browserforce.openPage(EDIT_VIEW_PATH);
    await page.locator(EDIT_BUTTON_SELECTOR).wait();
    const disableButton = await page.$(DISABLE_BUTTON_SELECTOR);
    const enabled = disableButton !== null;
    const response: Config = {
      enabled,
    };
    if (enabled) {
      response.certificate = await page
        .locator(CERT_NAME_SPAN_SELECTOR)
        .map((span) => span.innerText)
        .wait();
    }
    await page.close();
    return response;
  }

  public async apply(plan: Config): Promise<void> {
    if (plan.enabled && plan.certificate && plan.certificate !== '') {
      // enable with required certificate
      // wait for cert to become available in Identity Provider UI
      await pRetry(
        async () => {
          const certsResponse = await this.org
            .getConnection()
            .tooling.query<CertificateRecord>(
              `SELECT Id, DeveloperName FROM Certificate WHERE DeveloperName = '${plan.certificate}'`
            );
          if (!certsResponse.totalSize) {
            throw new AbortError(
              `Could not find Certificate '${plan.certificate}'`
            );
          }
          const page = await this.browserforce.openPage(EDIT_VIEW_PATH);
          await Promise.all([
            page.waitForNavigation(),
            page.locator(EDIT_BUTTON_SELECTOR).click(),
          ]);
          const certsHandle = await page
            .locator(`${CERTS_SELECT}`)
            .waitHandle();
          const chooseCertOptions = await certsHandle.$$eval(
            'option',
            (options) =>
              options.map((option) => ({
                text: option.text,
                value: option.value,
              }))
          );
          await certsHandle.dispose();
          const chooseCertOption = chooseCertOptions.find(
            (x) => x.text === plan.certificate
          );
          if (!chooseCertOption) {
            await page.close();
            throw new Error(
              `Waiting for Certificate '${plan.certificate}' to be available in Identity Provider picklist timed out`
            );
          }
          await page.locator(CERTS_SELECT).fill(chooseCertOption.value);
          page.on('dialog', async (dialog) => {
            await dialog.accept();
          });
          await Promise.all([
            page.waitForNavigation(),
            page.locator(SAVE_BUTTON_SELECTOR).click(),
          ]);
          await page.close();
        },
        {
          retries: 5,
          minTimeout: 2 * 1000,
        }
      );
    } else {
      // disable
      const page = await this.browserforce.openPage(EDIT_VIEW_PATH);
      page.on('dialog', async (dialog) => {
        await dialog.accept();
      });
      await Promise.all([
        page.waitForNavigation(),
        page.locator(DISABLE_BUTTON_SELECTOR).click(),
      ]);
      await page.close();
    }
  }
}
