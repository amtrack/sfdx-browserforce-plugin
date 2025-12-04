import { BrowserforcePlugin } from '../../plugin.js';

const getUrl = (orgId: string) => `/${orgId}/e`;

const CURRENCY_DROPDOWN_SELECTOR = '#DefaultCurrencyIsoCode';
const SAVE_BUTTON_SELECTOR = 'input[class="btn"][type="submit"][name="save"]';

export type Config = {
  defaultCurrencyIsoCode: string;
};

export class CompanyInformation extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    const page = await this.browserforce.openPage(getUrl(this.org.getOrgId()));

    const response: Config = {
      defaultCurrencyIsoCode: '',
    };
    const selectedOption = await page
      .locator(`${CURRENCY_DROPDOWN_SELECTOR} > option[selected]`)
      .textContent();
    if (selectedOption) {
      response.defaultCurrencyIsoCode = selectedOption;
    }
    await page.close();
    return response;
  }

  public async apply(config: Config): Promise<void> {
    if (config.defaultCurrencyIsoCode !== undefined) {
      const page = await this.browserforce.openPage(
        getUrl(this.org.getOrgId())
      );

      await page.locator(CURRENCY_DROPDOWN_SELECTOR).waitFor();
      const availableCurrencies = await page
        .locator(`${CURRENCY_DROPDOWN_SELECTOR} > option`)
        .allTextContents();
      if (!availableCurrencies.includes(config.defaultCurrencyIsoCode)) {
        throw new Error(
          `Invalid currency provided. '${config.defaultCurrencyIsoCode}' is not a valid option available for currencies. Please use the exact name as it appears in the list.`
        );
      }
      await page
        .locator(CURRENCY_DROPDOWN_SELECTOR)
        .selectOption({ label: config.defaultCurrencyIsoCode });

      // auto accept the dialog when it appears
      page.on('dialog', (dialog) => {
        dialog.accept();
      });

      // save
      await page.locator(SAVE_BUTTON_SELECTOR).click();
      await page.waitForURL((url) => !url.pathname.endsWith('/e'));
      await page.close();
    }
  }
}
