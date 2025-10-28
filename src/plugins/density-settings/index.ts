import { Locator, Page } from 'playwright';
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
  locator: Locator;
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
    const locator = page.locator(PICKER_ITEMS_SELECTOR);
    await locator.first().waitFor();
    
    const count = await locator.count();
    const result: Density[] = [];
    
    for (let i = 0; i < count; i++) {
      const element = locator.nth(i);
      const value = await element.inputValue();
      const checked = await element.isChecked();
      result.push({
        value,
        checked,
        locator: element,
      });
    }
    
    return result;
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
      densityToSelect.locator.click(),
    ]);
  }
}
