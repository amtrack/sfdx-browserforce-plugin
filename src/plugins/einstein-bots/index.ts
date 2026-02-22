import { BrowserforcePlugin } from '../../plugin.js';

const BASE_PATH = '/lightning/setup/EinsteinBots/home';

// The checkbox input element (for reading state and clicking)
const TOGGLE_INPUT_SELECTOR = 'input[type="checkbox"][aria-label*="Einstein Bots"]';

type Config = {
  enabled: boolean;
};

export class EinsteinBots extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    await using page = await this.browserforce.openPage(BASE_PATH);
    await page.locator(TOGGLE_INPUT_SELECTOR).waitFor();
    const response = {
      enabled: await page.locator(TOGGLE_INPUT_SELECTOR).isChecked(),
    };
    return response;
  }

  public async apply(config: Config): Promise<void> {
    await using page = await this.browserforce.openPage(BASE_PATH);
    await page.locator(TOGGLE_INPUT_SELECTOR).waitFor();
    const currentState = await page.locator(TOGGLE_INPUT_SELECTOR).isChecked();
    // Only click if the state needs to change
    if (currentState !== config.enabled) {
      if (!config.enabled) {
        // When disabling, click the toggle and wait for the confirmation dialog
        await page.locator(TOGGLE_INPUT_SELECTOR).click({ force: true });

        // Wait for the "Disable Einstein Bots" dialog and click Yes
        const disableDialog = page.getByRole('dialog', { name: 'Disable Einstein Bots' });
        await disableDialog.waitFor({ timeout: 5000 });
        await disableDialog.getByRole('button', { name: 'Yes' }).click();

        // Wait for the dialog to close (this is when the save happens)
        await disableDialog.waitFor({ state: 'hidden', timeout: 10000 });
      } else {
        // When enabling, just click the toggle
        await page.locator(TOGGLE_INPUT_SELECTOR).click({ force: true });
      }

      // Wait for the save to complete
      await page.waitForTimeout(2000);
    }
  }
}
