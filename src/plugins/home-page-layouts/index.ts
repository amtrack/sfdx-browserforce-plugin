import { SalesforceId } from 'jsforce';
import * as jsonMergePatch from 'json-merge-patch';
import { ShapePlugin } from '../../plugin';

const PATHS = {
  BASE: 'setup/ui/assignhomelayoutedit.jsp'
};
const SELECTORS = {
  BASE: 'table.detailList',
  SAVE_BUTTON: 'input[name="save"]'
};

interface ProfileRecord {
  Id: SalesforceId;
  Name: string;
}

interface HomePageLayoutRecord {
  Id: SalesforceId;
  Name: string;
}

export default class HomePageLayouts extends ShapePlugin {
  public async retrieve() {
    const page = this.browserforce.page;
    await page.goto(`${this.browserforce.getInstanceUrl()}/${PATHS.BASE}`);
    await page.waitFor(SELECTORS.BASE);
    const profiles = await page.$$eval(
      'table.detailList tbody tr td label',
      (labels: HTMLLabelElement[]) => {
        return labels.map(label => {
          for (let i = 0; label.childNodes.length; i++) {
            if (label.childNodes[i].nodeType === label.TEXT_NODE) {
              return label.childNodes[i].nodeValue;
            }
          }
          throw new Error('retrieving HomePageLayouts failed');
        });
      }
    );
    const layouts = await page.$$eval(
      'table.detailList tbody tr td select',
      (selects: HTMLSelectElement[]) => {
        return selects
          .map(select => select.selectedOptions[0].text)
          .map(text => (text === 'Home Page Default' ? '' : text));
      }
    );
    const homePageLayoutAssignment = {};
    for (let i = 0; i < profiles.length; i++) {
      homePageLayoutAssignment[profiles[i]] = layouts[i];
    }
    return {
      homePageLayoutAssignment
    };
  }

  public diff(source, target) {
    const profiles = Object.keys(target.homePageLayoutAssignment);
    for (const key in source.homePageLayoutAssignment) {
      if (!profiles.includes(key)) {
        delete source.homePageLayoutAssignment[key];
      }
    }
    return jsonMergePatch.generate(source, target);
  }

  public async apply(config) {
    const profilesList = Object.keys(config.homePageLayoutAssignment)
      .map(profile => {
        return `'${profile}'`;
      })
      .join(',');
    const layoutsList = Object.values(config.homePageLayoutAssignment)
      .map(layout => {
        return `'${layout}'`;
      })
      .join(',');
    const profiles = await this.org
      .getConnection()
      .tooling.query<ProfileRecord>(
        `SELECT Id, Name FROM Profile WHERE Name IN (${profilesList})`
      );
    const homePageLayouts = await this.org
      .getConnection()
      .tooling.query<HomePageLayoutRecord>(
        `SELECT Id, Name FROM HomePageLayout WHERE Name IN (${layoutsList})`
      );
    const page = this.browserforce.page;
    await page.goto(`${this.browserforce.getInstanceUrl()}/${PATHS.BASE}`);
    await page.waitFor(SELECTORS.BASE);
    for (const profileName of Object.keys(config.homePageLayoutAssignment)) {
      const homePageLayoutName = config.homePageLayoutAssignment[profileName];
      const profile = profiles.records.find(p => p.Name === profileName);
      let homePageLayout = homePageLayouts.records.find(
        l => l.Name === homePageLayoutName
      );
      if (homePageLayoutName === '') {
        homePageLayout = { Id: 'default', Name: 'default' };
      }
      const profileSelector = `select[id='${profile.Id.substring(0, 15)}']`;
      await page.waitFor(profileSelector);
      await page.select(profileSelector, homePageLayout.Id.substring(0, 15));
    }
    await Promise.all([
      page.waitForNavigation(),
      page.click(SELECTORS.SAVE_BUTTON)
    ]);
  }
}
