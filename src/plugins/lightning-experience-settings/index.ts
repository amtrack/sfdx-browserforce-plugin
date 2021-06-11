import { BrowserforcePlugin } from '../../plugin';

const PATHS = {
  BASE: 'lightning/setup/ThemingAndBranding/home'
};

const THEME_ROW_SELECTOR =
  'pierce/#setupComponent lightning-datatable table > tbody > tr';
const SELECTORS = {
  DEVELOPER_NAMES: `${THEME_ROW_SELECTOR} > td:nth-child(2) > lightning-primitive-cell-factory lightning-base-formatted-text`,
  STATES: `${THEME_ROW_SELECTOR} > td:nth-child(6) > lightning-primitive-cell-factory`
};

export default class LightningExperienceSettings extends BrowserforcePlugin {
  public async retrieve() {
    const page = await this.browserforce.openPage(PATHS.BASE, {
      waitUntil: ['load', 'domcontentloaded', 'networkidle0']
    });
    const themes = await this.getThemeData(page);
    const activeTheme = themes.find(theme => theme.isActive);
    const response = {
      activeThemeName: activeTheme.developerName
    };
    return response;
  }

  public async apply(config) {
    const page = await this.browserforce.openPage(PATHS.BASE, {
      waitUntil: ['load', 'domcontentloaded', 'networkidle0']
    });

    await this.setActiveTheme(page, config.activeThemeName);
  }

  async getThemeData(page) {
    await page.waitForSelector(THEME_ROW_SELECTOR);
    const rowElementHandles = await page.$$(THEME_ROW_SELECTOR);
    await page.waitForSelector(SELECTORS.DEVELOPER_NAMES);
    const developerNames = await page.$$eval(SELECTORS.DEVELOPER_NAMES, cells =>
      cells.map(cell => cell.innerText)
    );
    const states = await page.$$eval(SELECTORS.STATES, cells =>
      cells.map(
        cell =>
          cell.shadowRoot?.querySelector('lightning-primitive-icon') !== null
      )
    );
    return developerNames.map((developerName, i) => {
      return {
        developerName,
        isActive: states[i],
        rowElementHandle: rowElementHandles[i]
      };
    });
  }

  async setActiveTheme(page, themeDeveloperName) {
    const data = await this.getThemeData(page);
    const theme = data.find(
      theme => theme.developerName === themeDeveloperName
    );
    const newActiveThemeRowElementHandle = theme.rowElementHandle;
    await page.waitForSelector(`${THEME_ROW_SELECTOR} lightning-button-menu`, {
      visible: true
    });
    const menuButton = await newActiveThemeRowElementHandle.$(
      'pierce/td lightning-primitive-cell-factory lightning-primitive-cell-actions lightning-button-menu'
    );
    await menuButton.click();
    await page.waitForSelector(
      `${THEME_ROW_SELECTOR} lightning-button-menu slot lightning-menu-item`,
      { visible: true }
    );
    const menuItems = await menuButton.$$('pierce/slot lightning-menu-item');
    // second last item: [show, activate, preview]
    const activateMenuItem = menuItems[menuItems.length - 2];
    await Promise.all([
      page.waitForNavigation({
        waitUntil: ['load', 'domcontentloaded', 'networkidle0']
      }),
      activateMenuItem.click()
    ]);
  }
}
