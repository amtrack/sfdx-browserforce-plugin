import { waitForPageErrors } from '../../browserforce.js';
import { BrowserforcePlugin } from '../../plugin.js';

const BASE_PATH = '/lightning/setup/DensitySetup/home';

type Density = 'Comfy' | 'Compact';
type Config = {
  density: Density;
};

const availableOptions = ['Comfy', 'Compact'];

export class DensitySettings extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    await using page = await this.browserforce.openPage(BASE_PATH);
    const density = (await page.locator('input[name="options"]:checked').getAttribute('value')) as Density;
    return {
      density,
    };
  }

  public async apply(config: Config): Promise<void> {
    if (!availableOptions.includes(config.density)) {
      throw new Error(`Could not find density "${config.density}". Available options: ${availableOptions.join(', ')}`);
    }
    await using page = await this.browserforce.openPage(BASE_PATH);
    const densityPickerItem = page.locator(
      `one-density-visual-picker-item:has(input[name="options"][value="${config.density}"])`,
    );
    await Promise.all([
      Promise.race([page.waitForResponse(/DensityUserSettings\.setDefaultDensitySetting=1/), waitForPageErrors(page)]),
      densityPickerItem.click(),
    ]);
  }
}
