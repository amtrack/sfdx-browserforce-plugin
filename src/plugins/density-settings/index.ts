import { ElementHandle, Page } from 'puppeteer';
import { BrowserforcePlugin } from '../../plugin.js';

const BASE_PATH = 'lightning/setup/DensitySetup/home';

const PICKER_ITEMS_SELECTOR =
  'one-density-visual-picker one-density-visual-picker-item input';

type Config = {
  density: string;
};

type Density = {
  value: string;
  checked: boolean;
  elementHandle: ElementHandle;
};

export class DensitySettings extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    const page = await this.browserforce.openPage(BASE_PATH);
    const densities = await this.getDensities(page);
    const selected = densities.find((input) => input.checked);
    await page.close();
    return {
      density: selected!.value,
    };
  }

  public async apply(config: Config): Promise<void> {
    const page = await this.browserforce.openPage(BASE_PATH);
    await this.setDensity(page, config.density);
    await page.close();
  }

  async getDensities(page: Page): Promise<Density[]> {
    await page.waitForSelector(PICKER_ITEMS_SELECTOR);
    const elementHandles = await page.$$(PICKER_ITEMS_SELECTOR);
    const result = await page.$$eval(
      PICKER_ITEMS_SELECTOR,
      (radioInputs: HTMLInputElement[]) =>
        radioInputs.map((input) => {
          return {
            value: input.value,
            checked: input.checked,
          };
        })
    );
    return result.map((input, i) => {
      return { ...input, elementHandle: elementHandles[i] };
    });
  }

  async setDensity(page: Page, name: string): Promise<void> {
    const densities = await this.getDensities(page);
    const densityToSelect = densities.find((input) => input.value === name);
    if (!densityToSelect) {
      throw new Error(
        `Could not find density "${name}" in list of densities: ${densities.map(
          (d) => d.value
        )}`
      );
    }
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response
            .url()
            .includes(
              'UserSettings.DensityUserSettings.setDefaultDensitySetting=1'
            ) && response.status() === 200
      ),
      densityToSelect.elementHandle.evaluate((input: HTMLInputElement) =>
        input.click()
      ),
    ]);
  }
}
