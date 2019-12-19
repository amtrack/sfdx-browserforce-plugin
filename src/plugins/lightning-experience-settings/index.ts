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

interface LightningPrimitiveCellTypes {
  columnType: string;
  // tslint:disable-next-line:no-any
  value: any;
}

const domWaitForLightningThemes = () => {
  return (
    document.querySelector('lightning-datatable') &&
    document.querySelector('lightning-datatable').shadowRoot &&
    document
      .querySelector('lightning-datatable')
      .shadowRoot.querySelectorAll(
        'table > tbody > tr > td:nth-child(2) > lightning-primitive-cell-factory'
      ).length >= 7 && // assuming there are at least 7 standard themes
    document
      .querySelector('lightning-datatable')
      .shadowRoot.querySelectorAll(
        'table > tbody > tr > td:nth-child(2) > lightning-primitive-cell-factory'
      )[1].shadowRoot &&
    document
      .querySelector('lightning-datatable')
      .shadowRoot.querySelectorAll(
        'table > tbody > tr > td:nth-child(2) > lightning-primitive-cell-factory'
      )[1]
      .shadowRoot.querySelector('lightning-primitive-cell-wrapper')
      .shadowRoot &&
    document
      .querySelector('lightning-datatable')
      .shadowRoot.querySelectorAll(
        'table > tbody > tr > td:nth-child(2) > lightning-primitive-cell-factory'
      )[1]
      .shadowRoot.querySelector('lightning-primitive-cell-wrapper')
      .shadowRoot.querySelector('div > slot')
  );
};

const domGetThemesData = () => {
  return Array.from(
    document
      .querySelector('lightning-datatable')
      .shadowRoot.querySelectorAll('table > tbody > tr')
  ).map(tr => {
    const slotDeveloperNameColumn: HTMLSlotElement = tr
      .querySelector('td:nth-child(2) > lightning-primitive-cell-factory')
      .shadowRoot.querySelector('lightning-primitive-cell-wrapper')
      .shadowRoot.querySelector('div > slot');
    // @ts-ignore
    const cellTypesDeveloperName: LightningPrimitiveCellTypes = slotDeveloperNameColumn.assignedNodes()[0];
    const developerName = cellTypesDeveloperName.value;
    const slotActiveColumn: HTMLSlotElement = tr
      .querySelector('td:nth-child(6) > lightning-primitive-cell-factory')
      .shadowRoot.querySelector('lightning-primitive-cell-wrapper')
      .shadowRoot.querySelector('div > slot');
    // @ts-ignore
    const cellTypesActive: LightningPrimitiveCellTypes = slotActiveColumn.assignedNodes()[0];
    const isActive = cellTypesActive.value;
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
      .shadowRoot.querySelectorAll('table > tbody > tr')
  );
  for (const tr of trs) {
    const slotDeveloperNameColumn: HTMLSlotElement = tr
      .querySelector('td:nth-child(2) > lightning-primitive-cell-factory')
      .shadowRoot.querySelector('lightning-primitive-cell-wrapper')
      .shadowRoot.querySelector('div > slot');
    // @ts-ignore
    const cellTypesDeveloperName: LightningPrimitiveCellTypes = slotDeveloperNameColumn.assignedNodes()[0];
    const developerName = cellTypesDeveloperName.value;
    if (developerName === name) {
      return cellTypesDeveloperName;
    }
  }
};
