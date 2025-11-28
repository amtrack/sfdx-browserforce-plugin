import { Page } from 'playwright';
import { waitForPageErrors } from '../../browserforce.js';
import { BrowserforcePlugin } from '../../plugin.js';

const BASE_PATH = 'lightning/setup/DensitySetup/home';

type Config = {
  density: string;
};

export class DensitySettings extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    const page = await this.browserforce.openPage(BASE_PATH);
    const density = await this.getSelectedDensity(page);
    await page.close();
    return {
      density,
    };
  }

  public async apply(config: Config): Promise<void> {
    const page = await this.browserforce.openPage(BASE_PATH);

    // Find the radio button by its value attribute
    const radioButton = page.getByRole('img', { name: config.density });

    // Wait for the radio button to be attached to the DOM
    try {
      await radioButton.waitFor({ state: 'attached', timeout: 10000 });
    } catch (error) {
      const allRadios = await page.getByRole('radio').all();
      const radioValues = await Promise.all(
        allRadios.map(async (radio) => {
          try {
            return await radio.getAttribute('value');
          } catch {
            return 'unknown';
          }
        })
      );
      throw new Error(
        `Could not find density "${
          config.density
        }". Available options: ${radioValues.filter(Boolean).join(', ')}`
      );
    }

    // Click the radio button with force to bypass label interception
    const promise = Promise.race([
      page.waitForResponse(/DensityUserSettings\.setDefaultDensitySetting=1/),
      waitForPageErrors(page),
    ]);
    await radioButton.click();
    await promise;
    await page.close();
  }

  private async getSelectedDensity(page: Page): Promise<string> {
    // Density options are represented as radio buttons with accessible names
    const densityOptions = ['Comfy', 'Compact'];

    for (const densityName of densityOptions) {
      // Find the radio button by its accessible name (starts with the density name)
      // Example: "Comfy Comfy For users who want a spacious view..."
      const radioButton = page.getByRole('radio', {
        name: new RegExp(`^${densityName}`, 'i'),
      });

      // Check if this radio button is checked
      if (await radioButton.isChecked()) {
        return densityName;
      }
    }

    throw new Error('No density option is selected');
  }
}
