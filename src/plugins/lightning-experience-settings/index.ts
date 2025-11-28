import { Locator, Page } from 'playwright';
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
  rowLocator: Locator;
};

export class LightningExperienceSettings extends BrowserforcePlugin {
  async setupDOMObserver(
    page: Page,
    elementName: string,
    callbackName: string
  ): Promise<void> {
    await page.evaluate(
      ({
        elementName,
        callbackName,
      }: {
        elementName: string;
        callbackName: string;
      }) => {
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const node of Array.from(mutation.addedNodes)) {
              if (
                node instanceof Element &&
                node.tagName.toLowerCase() === elementName
              ) {
                observer.disconnect();
                // Call the exposed function to handle the element
                (window as any)[callbackName]();
                return;
              }
            }
          }
        });
        observer.observe(document.body, { childList: true, subtree: false });
        // Clean up observer after navigation starts (element won't appear)
        window.addEventListener(
          'beforeunload',
          () => {
            observer.disconnect();
          },
          { once: true }
        );
      },
      { elementName, callbackName }
    );
  }

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
    await page.locator(THEME_ROW_SELECTOR).first().waitFor();
    const rowLocator = page.locator(THEME_ROW_SELECTOR);
    const rowCount = await rowLocator.count();

    await page.locator(DEVELOPER_NAMES_SELECTOR).first().waitFor();
    const developerNameLocator = page.locator(DEVELOPER_NAMES_SELECTOR);
    const stateLocator = page.locator(STATES_SELECTOR);

    const themes: Theme[] = [];
    for (let i = 0; i < rowCount; i++) {
      const developerName = await developerNameLocator.nth(i).innerText();
      const hasIcon = await stateLocator
        .nth(i)
        .filter({ has: page.locator('lightning-primitive-icon') })
        .isVisible();
      themes.push({
        developerName,
        isActive: hasIcon,
        rowLocator: rowLocator.nth(i),
      });
    }

    return themes;
  }

  async setActiveTheme(page: Page, themeDeveloperName: string): Promise<void> {
    const data = await this.getThemeData(page);
    const theme = data.find(
      (theme) => theme.developerName === themeDeveloperName
    );
    if (!theme) {
      throw new Error(
        `Could not find theme "${themeDeveloperName}" in list of themes: ${data.map(
          (d) => d.developerName
        )}`
      );
    }

    const newActiveThemeRowLocator = theme.rowLocator;
    await page
      .locator(`${THEME_ROW_SELECTOR} lightning-button-menu`)
      .first()
      .waitFor();

    const menuButton = newActiveThemeRowLocator.locator(
      'td lightning-primitive-cell-factory lightning-primitive-cell-actions lightning-button-menu'
    );
    await menuButton.click();

    await page
      .locator(
        `${THEME_ROW_SELECTOR} lightning-button-menu slot lightning-menu-item`
      )
      .first()
      .waitFor();

    const menuItems = menuButton.locator('slot lightning-menu-item');
    const menuItemCount = await menuItems.count();
    // second last item: [show, activate, preview]
    const activateMenuItem = menuItems.nth(menuItemCount - 2);

    await activateMenuItem.click();

    // When switching from a SDLS2 to a SLDS1 theme, the following modal appears:
    // Activate this theme?
    // This theme uses SLDS 1. When you activate this theme, you also disable SLDS 2.
    // - Never Mind
    // - Activate
    const confirmButton = await page.locator(
      'lightning-modal lightning-button[variant="brand"]'
    );
    if (await confirmButton.isVisible()) {
      await confirmButton.waitFor({ state: 'visible' });
      await confirmButton.click();
    }

    await page.locator('span.breadcrumbDetail.uiOutputText').waitFor();
  }
}
