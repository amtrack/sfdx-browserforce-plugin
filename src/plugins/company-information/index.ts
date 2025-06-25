import { BrowserforcePlugin } from '../../plugin.js';

const getUrl = (orgId: string) => `/${orgId}/e`;

const CURRENCY_DROPDOWN = 'select#DefaultCurrencyIsoCode';
const CURRENCY_DROPDOWN_SELECTED_OPTION = `${CURRENCY_DROPDOWN} > option[selected]`;
const SAVE_BUTTON_SELECTOR = 'input[type="submit"][name="save"]';

export type Config = {
  defaultCurrencyIsoCode: string;
};

export class CompanyInformation extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    const page = await this.browserforce.openPage(getUrl(this.org.getOrgId()));
    const response: Config = {
      defaultCurrencyIsoCode: await page
        .locator(CURRENCY_DROPDOWN_SELECTED_OPTION)
        .map((option) => option.textContent)
        .wait(),
    };
    await page.close();
    return response;
  }

  public async apply(config: Config): Promise<void> {
    if (config.defaultCurrencyIsoCode !== undefined) {
      const page = await this.browserforce.openPage(
        getUrl(this.org.getOrgId())
      );
      const dropDown = await page.locator(CURRENCY_DROPDOWN).waitHandle();
      const options = await dropDown.$$eval('option', (options) =>
        options.map((option) => ({
          value: option.value,
          textContent: option.textContent,
        }))
      );
      await dropDown.dispose();
      const toBeSelectedOption = options.find(
        (option) => option.textContent == config.defaultCurrencyIsoCode
      );
      if (!toBeSelectedOption) {
        throw new Error(
          `Invalid currency provided. '${config.defaultCurrencyIsoCode}' is not a valid option available for currencies. Please use the exact name as it appears in the list.`
        );
      }
      await page.locator(CURRENCY_DROPDOWN).fill(toBeSelectedOption.value);
      page.on('dialog', (dialog) => {
        dialog.accept();
      });
      await Promise.all([
        page.waitForNavigation(),
        page.locator(SAVE_BUTTON_SELECTOR).click(),
      ]);
      await page.close();
    }
  }
}
