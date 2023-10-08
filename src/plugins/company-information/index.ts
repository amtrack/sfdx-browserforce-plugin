import { BrowserforcePlugin } from '../../plugin';

const PATHS = (orgId: string) => ({
  BASE: `/${orgId}/e`
});
const SELECTORS = {
  BASE: 'div.pbBody',
  CURRENCY_DROPDOWN: '#DefaultCurrencyIsoCode',
  SAVE_BUTTON: 'input[class="btn"][type="submit"][name="save"]'
};

type Config = {
  defaultCurrencyIsoCode?: string;
};

export class CompanyInformation extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    const path = PATHS(this.org.getOrgId());
    const page = await this.browserforce.openPage(path.BASE);
    await page.waitForSelector(SELECTORS.CURRENCY_DROPDOWN);

    const response = {
      defaultCurrencyIsoCode: ''
    };
    const selectedOptions = await page.$$eval(
      `${SELECTORS.CURRENCY_DROPDOWN} > option[selected]`,
      options => options.map(option => option.textContent)
    );
    if (!selectedOptions) {
      throw new Error('No available existing value');
    }
    response.defaultCurrencyIsoCode = selectedOptions[0];
    await page.close();
    return response;
  }

  public async apply(config: Config): Promise<void> {
    if (config.defaultCurrencyIsoCode?.length > 0) {
      const path = PATHS(this.org.getOrgId());
      const page = await this.browserforce.openPage(path.BASE);

      // wait for selectors
      await page.waitForSelector(SELECTORS.CURRENCY_DROPDOWN);
      const selectElem = await page.$(SELECTORS.CURRENCY_DROPDOWN);
      await page.waitForSelector(SELECTORS.SAVE_BUTTON);

      // apply changes
      // await page.click(SELECTORS.CURRENCY_DROPDOWN);
      const optionList = await page.$$eval(
        `${SELECTORS.CURRENCY_DROPDOWN} > option`,
        options => options.map(option => ({
          value: (option as HTMLOptionElement).value,
          textContent: option.textContent
        }))
      );
      const toBeSelectedOption = optionList.find(option => option.textContent == config.defaultCurrencyIsoCode);
      if (!toBeSelectedOption) {
        throw new Error(`Invalid currency provided. '${config.defaultCurrencyIsoCode}' is not a valid option available for currencies. Please use the exact name as it appears in the list.`);
      }
      await selectElem.select(toBeSelectedOption.value);

      // auto accept the dialog when it appears
      page.on("dialog", (dialog) => {
        dialog.accept();
      });

      // save
      await Promise.all([
        page.waitForNavigation(),
        page.click(SELECTORS.SAVE_BUTTON)
      ]);
      await page.close();
    }
  }
}
