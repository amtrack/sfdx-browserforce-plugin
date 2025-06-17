import {BrowserforcePlugin} from '../../plugin.js';

const PATHS = {
  BASE: 'lightning/setup/OmniStudioSettings/home',
};
const SELECTORS = {
  CHECKBOXES: 'runtime_omnistudio-pref-toggle'
};

export type Config = {
  OmniStudioMetadata: boolean;
  StandardOmniStudioRuntime: boolean;
  OmniStudioCoreBuilderPref: boolean;
  LwcRedeploy: boolean;
  SldsPlusUIToggle: boolean;
};

export class OmnistudioSettings extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const page = await this.browserforce.openPage(PATHS.BASE);
    await page.waitForSelector(SELECTORS.CHECKBOXES);

    const state = await this.getState(page);

    const response = {
      OmniStudioMetadata: state.find(x.name === 'OmniStudioMetadata')?.checked ?? false,
      StandardOmniStudioRuntime: state.find(x.name === 'StandardOmniStudioRuntime')?.checked ?? false,
      OmniStudioCoreBuilderPref: state.find(x.name === 'OmniStudioCoreBuilderPref')?.checked ?? false,
      LwcRedeploy: state.find(x.name === 'LwcRedeploy')?.checked ?? false,
      SldsPlusUIToggle: state.find(x.name === 'SldsPlusUIToggle')?.checked ?? false
    };
    await page.close();
    return response;
  }

  private async getState(page: Page) {
    const checkboxes = await page.$$eval(
      SELECTORS.CHECKBOXES,
      (elements) =>
        Array.from(elements)
          .map((el: HTMLInputElement) => ({name: el.name, checked: el.checked}))
    );
    return checkboxes;
  }

  public async apply(config: Config): Promise<void> {
    const page = await this.browserforce.openPage(PATHS.BASE);
    await page.waitForSelector(SELECTORS.CHECKBOXES);

    let state = this.getState(page);


    for (const key of Object.keys(config) as (keyof Config)[]) {
      if (state[key] !== config[key]) {
        await page.$eval(
          `${SELECTORS.CHECKBOXES}[name="toggle-${key}"]`,
          (e: HTMLInputElement, v: boolean) => {
            e.checked = v;
          },
          config[key]
        );
      }
    }
    await page.waitForNetworkIdle();
    await page.close();
  }
}
