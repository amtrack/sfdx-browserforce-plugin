import { BrowserforcePlugin } from '../../plugin';

const PATHS = {
  BASE: 'lightning/setup/ImportedPackage/home'
};
const SELECTORS = {
  CONFIGURE: '.actionLink[title="Configure - Record 53 - Salesforce CPQ"]',
  HIDE_DOCUMENT_NAME: 'input[name="Hide Document Name"]',
  SAVE: 'input[value="Save"]'
};

export type Config = {
  hide: boolean;
};

export class CpqConfiguration extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const page = await this.browserforce.openPage(PATHS.BASE);
    // First we have to click the 'Edit' button, to see the checkbox
    await page.waitForSelector(SELECTORS.CONFIGURE);
    await Promise.all([page.waitForNavigation(), page.click(SELECTORS.CONFIGURE)]);
    await page.waitForSelector(SELECTORS.HIDE_DOCUMENT_NAME);
    const response = {
      hide: await page.$eval(SELECTORS.HIDE_DOCUMENT_NAME, (el: HTMLInputElement) => el.checked)
    };
    await page.close();
    return response;
  }

  public async apply(config: Config): Promise<void> {
    const page = await this.browserforce.openPage(PATHS.BASE);
    await page.waitForSelector(SELECTORS.CONFIGURE);
    await Promise.all([page.waitForNavigation(), page.click(SELECTORS.CONFIGURE)]);
    await page.waitForSelector(SELECTORS.HIDE_DOCUMENT_NAME);
    await page.$eval(
      SELECTORS.HIDE_DOCUMENT_NAME,
      (e: HTMLInputElement, v: boolean) => {
        e.checked = v;
      },
      config.hide
    );
    await Promise.all([page.click(SELECTORS.SAVE)]);
    await page.close();
  }
}
