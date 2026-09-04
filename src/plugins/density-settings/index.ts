import { z } from 'zod';
import { waitForPageErrors } from '../../page-errors.js';
import { BrowserforcePlugin } from '../../plugin.js';

export const densitySettingsSchema = z
  .object({
    density: z
      .enum(['Comfy', 'Compact'])
      .meta({ title: 'Density' })
      .describe('Choose the default display setting for your org')
      .optional(),
  })
  .meta({ id: 'densitySettings', title: 'Density Settings' });

const BASE_PATH = '/lightning/setup/DensitySetup/home';

export type DensitySettingsConfig = z.infer<typeof densitySettingsSchema>;
type Density = NonNullable<DensitySettingsConfig['density']>;

export class DensitySettings extends BrowserforcePlugin {
  public async retrieve(): Promise<DensitySettingsConfig> {
    await using page = await this.browserforce.openPage(BASE_PATH);
    const density = (await page.locator('input[name="options"]:checked').getAttribute('value')) as Density;
    return {
      density,
    };
  }

  public async apply(config: DensitySettingsConfig): Promise<void> {
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
