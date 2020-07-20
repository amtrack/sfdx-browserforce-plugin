import { BrowserforcePlugin } from '../../plugin';

const PATHS = {
  BASE: 'lightning/setup/ThemingAndBranding/home'
};

export default class LightningExperienceSettings extends BrowserforcePlugin {
  public async retrieve() {
    const page = await this.browserforce.openPage(PATHS.BASE, {
      waitUntil: ['load', 'domcontentloaded', 'networkidle0']
    });
    await page.waitForFunction(domWaitForLightningThemes);
    const themes = await page.evaluate(domGetThemesData);
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

    await page.waitForFunction(domWaitForLightningThemes);
    const cellJsHandle = await page.evaluateHandle(
      domGetThemeDeveloperNameLightningPrimitiveCellTypes,
      config.activeThemeName
    );

    // click in TargetTheme/DeveloperName cell and use keyboard navigation from there on
    await cellJsHandle.asElement().click();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    await page.waitFor(1000);
    await page.keyboard.press('ArrowUp');
    await page.waitFor(1000);
    await page.keyboard.press('ArrowUp');
    await page.waitFor(1000);
    await Promise.all([
      page.waitForNavigation({
        waitUntil: ['load', 'domcontentloaded', 'networkidle0']
      }),
      page.keyboard.press('Space')
    ]);
  }
}

const domWaitForLightningThemes = () => {
  return document
    .querySelector('lightning-datatable')
    ?.shadowRoot?.querySelectorAll(
      'table > tbody > tr > td:nth-child(2) > lightning-primitive-cell-factory'
    )?.[1]
    ?.shadowRoot?.querySelector('lightning-formatted-text')?.shadowRoot
    ?.textContent;
};

const domGetThemesData = () => {
  return Array.from(
    document
      .querySelector('lightning-datatable')
      ?.shadowRoot?.querySelectorAll('table > tbody > tr')
  ).map(tr => {
    const developerName = tr
      ?.querySelector('td:nth-child(2) > lightning-primitive-cell-factory')
      ?.shadowRoot?.querySelector('lightning-formatted-text')?.shadowRoot
      ?.textContent;
    const isActive =
      tr
        ?.querySelector('td:nth-child(6) > lightning-primitive-cell-factory')
        ?.shadowRoot?.querySelector('lightning-primitive-icon') !== null;
    return {
      developerName,
      isActive
    };
  });
};

const domGetThemeDeveloperNameLightningPrimitiveCellTypes = name => {
  const trs = Array.from(
    document
      .querySelector('lightning-datatable')
      ?.shadowRoot?.querySelectorAll('table > tbody > tr')
  );
  for (const tr of trs) {
    const cellDeveloperNameColumn = tr
      ?.querySelector('td:nth-child(2) > lightning-primitive-cell-factory')
      ?.shadowRoot?.querySelector('lightning-formatted-text');
    const developerName = cellDeveloperNameColumn?.shadowRoot?.textContent;
    if (developerName === name) {
      return cellDeveloperNameColumn;
    }
  }
};
