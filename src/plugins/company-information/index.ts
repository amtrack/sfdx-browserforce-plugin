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
    await page.waitForSelector(CURRENCY_DROPDOWN_SELECTOR);

    const response: Config = {
      defaultCurrencyIsoCode: '',
    };
    const selectedOptions = await page.$$eval(
      `${CURRENCY_DROPDOWN_SELECTOR} > option[selected]`,
      (options) => options.map((option) => option.textContent)
    );
    if (selectedOptions?.length) {
      response.defaultCurrencyIsoCode = selectedOptions[0] ?? '';
    }
    await page.close();
    return response;
  }

  public async apply(config: Config): Promise<void> {
    if (config.defaultCurrencyIsoCode !== undefined) {
      const page = await this.browserforce.openPage(
        getUrl(this.org.getOrgId())
      );
      // wait for selectors
      await page.waitForSelector(CURRENCY_DROPDOWN_SELECTOR);
      const selectElem = await page.$(CURRENCY_DROPDOWN_SELECTOR);
      await page.waitForSelector(SAVE_BUTTON_SELECTOR);

      // apply changes
      // await page.click(CURRENCY_DROPDOWN_SELECTOR);
      const optionList = await page.$$eval(
        `${CURRENCY_DROPDOWN_SELECTOR} > option`,
        (options) =>
          options.map((option) => ({
            value: (option as HTMLOptionElement).value,
            textContent: option.textContent,
          }))
      );
      const toBeSelectedOption = optionList.find(
        (option) => option.textContent == config.defaultCurrencyIsoCode
      );
      if (!toBeSelectedOption) {
        throw new Error(
          `Invalid currency provided. '${config.defaultCurrencyIsoCode}' is not a valid option available for currencies. Please use the exact name as it appears in the list.`
        );
      }
      await selectElem!.select(toBeSelectedOption.value);

      // auto accept the dialog when it appears
      page.on('dialog', (dialog) => {
        dialog.accept();
      });

      // save
      await Promise.all([
        page.waitForNavigation(),
        page.click(SAVE_BUTTON_SELECTOR),
      ]);
      await page.close();
    }
  }
}
