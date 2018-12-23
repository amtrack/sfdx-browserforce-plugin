import { SalesforceId } from 'jsforce';
import * as jsonMergePatch from 'json-merge-patch';
import { BrowserforcePlugin } from '../../../plugin';
import { removeNullValues, retry } from '../../utils';

const PATHS = {
  EDIT_VIEW: 'setup/secur/idp/IdpPage.apexp'
};
const SELECTORS = {
  CHOOSE_CERT: 'select[id$=":chooseCert"]',
  CERT_NAME_SPAN: 'span[id$="developer__name"',
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
    await this.browserforce.goto(PATHS.EDIT_VIEW);
    await page.waitFor(SELECTORS.EDIT_BUTTON);
    const disableButton = await page.$(SELECTORS.DISABLE_BUTTON);
    const certNameHandle = await page.$(SELECTORS.CERT_NAME_SPAN);
    const response = {
      enabled: disableButton !== null
    };
    if (certNameHandle) {
      response['certificate'] = await page.evaluate(
        (span: HTMLSpanElement) => span.innerText,
        certNameHandle
      );
    }
    return response;
  }

  public diff(state, definition) {
    return removeNullValues(jsonMergePatch.generate(state, definition));
  }

  public async apply(plan) {
    const page = this.browserforce.page;
    if (plan.enabled && plan.certificate && plan.certificate !== '') {
      // wait for cert to become available in Identity Provider UI
      await retry(
        async () => {
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
          await this.browserforce.goto(PATHS.EDIT_VIEW);
          await page.waitFor(SELECTORS.EDIT_BUTTON);
          await Promise.all([
            page.waitForNavigation(),
            page.click(SELECTORS.EDIT_BUTTON)
          ]);
          await page.waitFor(SELECTORS.CHOOSE_CERT);
          const chooseCertOptions = await page.$$eval(
            `${SELECTORS.CHOOSE_CERT} option`,
            (options: HTMLOptionElement[]) => {
              return options.map(option => {
                return {
                  text: option.text,
                  value: option.value
                };
              });
            }
          );
          const chooseCertOption = chooseCertOptions.find(
            x => x.text === plan.certificate
          );
          if (!chooseCertOption) {
            throw new Error(
              `Waiting for Certificate '${
                plan.certificate
              }' to be available in Identity Provider picklist timed out`
            );
          }
          await page.select(SELECTORS.CHOOSE_CERT, chooseCertOption.value);
          page.on('dialog', async dialog => {
            await dialog.accept();
          });
          await page.waitFor(SELECTORS.SAVE_BUTTON);
          await Promise.all([
            page.waitForNavigation(),
            page.click(SELECTORS.SAVE_BUTTON)
          ]);
        },
        5,
        2000
      );
    } else {
      await this.browserforce.goto(PATHS.EDIT_VIEW);
      await page.waitFor(SELECTORS.EDIT_BUTTON);
      await page.$(SELECTORS.DISABLE_BUTTON);
      page.on('dialog', async dialog => {
        await dialog.accept();
      });
      await Promise.all([
        page.waitForNavigation(),
        page.click(SELECTORS.DISABLE_BUTTON)
      ]);
    }
  }
}
