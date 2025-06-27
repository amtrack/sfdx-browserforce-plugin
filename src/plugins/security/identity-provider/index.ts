import type { Record } from '@jsforce/jsforce-node';
import pRetry, { AbortError } from 'p-retry';
import { BrowserforcePlugin } from '../../../plugin.js';

const EDIT_VIEW_PATH = 'setup/secur/idp/IdpPage.apexp';

const CHOOSE_CERT_SELECTOR = 'select[id$=":chooseCert"]';
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
    await page.waitForSelector(EDIT_BUTTON_SELECTOR);
    const disableButton = await page.$(DISABLE_BUTTON_SELECTOR);
    const enabled = disableButton !== null;
    const response: Config = {
      enabled,
    };
    if (enabled) {
      const certNameHandle = await page.$(CERT_NAME_SPAN_SELECTOR);
      response.certificate = await page.evaluate(
        (span: HTMLSpanElement) => span.innerText,
        certNameHandle
      );
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
          await page.waitForSelector(EDIT_BUTTON_SELECTOR);
          await Promise.all([
            page.waitForNavigation(),
            page.click(EDIT_BUTTON_SELECTOR),
          ]);
          await page.waitForSelector(CHOOSE_CERT_SELECTOR);
          const chooseCertOptions = await page.$$eval(
            `${CHOOSE_CERT_SELECTOR} option`,
            (options: HTMLOptionElement[]) => {
              return options.map((option) => {
                return {
                  text: option.text,
                  value: option.value,
                };
              });
            }
          );
          const chooseCertOption = chooseCertOptions.find(
            (x) => x.text === plan.certificate
          );
          if (!chooseCertOption) {
            throw new Error(
              `Waiting for Certificate '${plan.certificate}' to be available in Identity Provider picklist timed out`
            );
          }
          await page.select(CHOOSE_CERT_SELECTOR, chooseCertOption.value);
          page.on('dialog', async (dialog) => {
            await dialog.accept();
          });
          await page.waitForSelector(SAVE_BUTTON_SELECTOR);
          await Promise.all([
            page.waitForNavigation(),
            page.click(SAVE_BUTTON_SELECTOR),
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
      await page.waitForSelector(EDIT_BUTTON_SELECTOR);
      await page.$(DISABLE_BUTTON_SELECTOR);
      page.on('dialog', async (dialog) => {
        await dialog.accept();
      });
      await Promise.all([
        page.waitForNavigation(),
        page.click(DISABLE_BUTTON_SELECTOR),
      ]);
      await page.close();
    }
  }
}
