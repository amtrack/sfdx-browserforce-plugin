import { type Page } from 'puppeteer';
import { BrowserforcePlugin } from '../../plugin.js';

const BASE_PATH = 'lightning/setup/DensitySetup/home';

const PICKER = 'one-density-visual-picker';
const PICKER_ITEM_INPUT = 'one-density-visual-picker-item input';

type Config = {
  density: string;
};

type Density = {
  value: string;
  checked: boolean;
};

export class DensitySettings extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    const page = await this.browserforce.openPage(BASE_PATH);
    const densities = await this.getDensities(page);
    const selected = densities.find((input) => input.checked)!;
    await page.close();
    return {
      density: selected.value,
    };
  }

  public async apply(config: Config): Promise<void> {
    const page = await this.browserforce.openPage(BASE_PATH);
    await this.setDensity(page, config.density);
    await page.close();
  }

  async getDensities(page: Page): Promise<Density[]> {
    // wait for the items to be ready
    await page.locator(PICKER_ITEM_INPUT).wait();
    const picker = await page.locator(PICKER).waitHandle();
    const result = await picker.$$eval(PICKER_ITEM_INPUT, (inputs) =>
      inputs.map((input) => {
        return {
          value: input.value,
          checked: input.checked,
        };
      })
    );
    await picker.dispose();
    return result;
  }

  async setDensity(page: Page, name: string): Promise<void> {
    const densities = await this.getDensities(page);
    const densityToSelect = densities.find((input) => input.value === name);
    if (!densityToSelect) {
      await page.close();
      throw new Error(
        `Could not find density "${name}" in list of densities: ${densities.map(
          (d) => d.value
        )}`
      );
    }
    const pickerItemSelector = `one-density-visual-picker-item:has(input[value='${name}'])`;
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response
            .url()
            .includes(
              'UserSettings.DensityUserSettings.setDefaultDensitySetting=1'
            ) && response.ok()
      ),
      page.locator(pickerItemSelector).click(),
    ]);
  }
}
