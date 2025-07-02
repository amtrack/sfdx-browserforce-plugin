import { ElementHandle, Page } from 'puppeteer';
import { BrowserforcePlugin } from '../../plugin.js';

const BASE_PATH = 'lightning/setup/ThemingAndBranding/home';

// Spring 25 changed "lightning-datatable" to "one-theme-datatable"
const THEME_ROW_SELECTOR = '#setupComponent table > tbody > tr';
const DEVELOPER_NAMES_SELECTOR = `${THEME_ROW_SELECTOR} > td:nth-child(2) > lightning-primitive-cell-factory lightning-base-formatted-text`;
const STATES_SELECTOR = `${THEME_ROW_SELECTOR} > td:nth-child(6) > lightning-primitive-cell-factory`;

type Config = {
  activeThemeName: string;
};

type Theme = {
  developerName: string;
  isActive: boolean;
  rowElementHandle: ElementHandle;
};

export class LightningExperienceSettings extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    const page = await this.browserforce.openPage(BASE_PATH);
    const themes = await this.getThemeData(page);
    const activeTheme = themes.find((theme) => theme.isActive);
    const response = {
      activeThemeName: activeTheme!.developerName,
    };
    await page.close();
    return response;
  }

  public async apply(config: Config): Promise<void> {
    const page = await this.browserforce.openPage(BASE_PATH);
    await this.setActiveTheme(page, config.activeThemeName);
    await page.close();
  }

  async getThemeData(page: Page): Promise<Theme[]> {
    await page.waitForSelector(THEME_ROW_SELECTOR);
    const rowElementHandles = await page.$$(THEME_ROW_SELECTOR);
    await page.waitForSelector(DEVELOPER_NAMES_SELECTOR);
    const developerNames = await page.$$eval(
      DEVELOPER_NAMES_SELECTOR,
      (cells) => cells.map((cell: HTMLTableCellElement) => cell.innerText)
    );
    const states = await page.$$eval(STATES_SELECTOR, (cells) =>
      cells.map(
        (cell) =>
          cell.shadowRoot?.querySelector('lightning-primitive-icon') !== null
      )
    );
    return developerNames.map((developerName, i) => {
      return {
        developerName,
        isActive: states[i],
        rowElementHandle: rowElementHandles[i],
      };
    });
  }

  async setActiveTheme(page: Page, themeDeveloperName: string): Promise<void> {
    const data = await this.getThemeData(page);
    const theme = data.find(
      (theme) => theme.developerName === themeDeveloperName
    );
    if (!theme) {
      await page.close();
      throw new Error(
        `Could not find theme "${themeDeveloperName}" in list of themes: ${data.map(
          (d) => d.developerName
        )}`
      );
    }
    const newActiveThemeRowElementHandle = theme.rowElementHandle;
    await page.waitForSelector(`${THEME_ROW_SELECTOR} lightning-button-menu`, {
      visible: true,
    });
    const menuButton = await newActiveThemeRowElementHandle.$(
      'td lightning-primitive-cell-factory lightning-primitive-cell-actions lightning-button-menu'
    );
    await page.evaluate((e: HTMLElement) => e.click(), menuButton);
    await page.waitForSelector(
      `${THEME_ROW_SELECTOR} lightning-button-menu slot lightning-menu-item`,
      {
        visible: true,
      }
    );
    const menuItems = await menuButton!.$$('slot lightning-menu-item');
    // second last item: [show, activate, preview]
    const activateMenuItem = menuItems[menuItems.length - 2];
    await Promise.all([
      page.waitForNavigation(),
      page.evaluate((e: HTMLElement) => e.click(), activateMenuItem),
    ]);
  }
}
