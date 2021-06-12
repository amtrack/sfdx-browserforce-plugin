import { BrowserforcePlugin } from '../../plugin';

const PATHS = {
  BASE: 'lightning/setup/DensitySetup/home'
};

const SELECTORS = {
  PICKER_ITEMS:
    'pierce/one-density-visual-picker one-density-visual-picker-item input'
};

export default class DensitySettings extends BrowserforcePlugin {
  public async retrieve() {
    const page = await this.browserforce.openPage(PATHS.BASE, {
      waitUntil: ['load', 'domcontentloaded', 'networkidle0']
    });
    const densities = await this.getDensities(page);
    const selected = densities.find(input => input.checked);
    return {
      density: selected?.value
    };
  }

  public async apply(config) {
    const page = await this.browserforce.openPage(PATHS.BASE, {
      waitUntil: ['load', 'domcontentloaded', 'networkidle0']
    });
    await this.setDensity(page, config.density);
  }

  async getDensities(page) {
    await page.waitForSelector(SELECTORS.PICKER_ITEMS);
    const elementHandles = await page.$$(SELECTORS.PICKER_ITEMS);
    const result = await page.$$eval(
      SELECTORS.PICKER_ITEMS,
      (radioInputs: HTMLInputElement[]) =>
        radioInputs.map(input => {
          return {
            value: input.value,
            checked: input.checked
          };
        })
    );
    return result.map((input, i) => {
      return { ...input, elementHandle: elementHandles[i] };
    });
  }

  async setDensity(page, name) {
    const densities = await this.getDensities(page);
    const densityToSelect = densities.find(input => input.value === name);
    await Promise.all([
      page.waitForResponse(
        response =>
          response
            .url()
            .includes(
              'UserSettings.DensityUserSettings.setDefaultDensitySetting=1'
            ) && response.status() === 200
      ),
      densityToSelect.elementHandle.evaluate(input => input.click())
    ]);
  }
}
