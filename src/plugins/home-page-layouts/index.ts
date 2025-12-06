import type { Record } from '@jsforce/jsforce-node';
import { waitForPageErrors } from '../../browserforce.js';
import { BrowserforcePlugin } from '../../plugin.js';

const BASE_PATH = `setup/ui/assignhomelayoutedit.jsp?retURL=${encodeURIComponent('/setup/forcecomHomepage.apexp')}`;

const BASE_SELECTOR = 'table.detailList';
const SAVE_BUTTON_SELECTOR = 'input[name="save"]';

interface ProfileRecord extends Record {
  Name: string;
}

interface HomePageLayoutRecord extends Record {
  Name: string;
}

type Config = {
  homePageLayoutAssignments: HomePageLayoutAssignment[];
};

type HomePageLayoutAssignment = {
  profile: string;
  layout: string;
};

export class HomePageLayouts extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    await using page = await this.browserforce.openPage(BASE_PATH);
    await page.locator(BASE_SELECTOR).waitFor();

    const profiles = (
      await page.locator('table.detailList tbody tr td label').allTextContents()
    ).map((label) => label.replace(/^\*/, '')); // removing * from assistiveText

    const layouts = (
      await page
        .locator('table.detailList tbody tr td select option:checked')
        .allTextContents()
    ).map((layout) => (layout === 'Home Page Default' ? '' : layout)); // value is "default" instead of an id

    const homePageLayoutAssignments: HomePageLayoutAssignment[] = profiles.map(
      (profile, i) => ({
        profile,
        layout: layouts[i],
      })
    );
    return {
      homePageLayoutAssignments,
    };
  }

  public diff(source: Config, target: Config): Config | undefined {
    target.homePageLayoutAssignments.sort(compareAssignment);
    const profileNames = target.homePageLayoutAssignments.map(
      (assignment) => assignment.profile
    );
    source.homePageLayoutAssignments = source.homePageLayoutAssignments
      .filter((assignment) => profileNames.includes(assignment.profile))
      .sort(compareAssignment);
    return super.diff(source, target) as Config | undefined;
  }

  public async apply(config: Config): Promise<void> {
    const profilesList = config.homePageLayoutAssignments
      .map((assignment) => {
        return `'${assignment.profile}'`;
      })
      .join(',');
    const layoutsList = config.homePageLayoutAssignments
      .map((assignment) => {
        return `'${assignment.layout}'`;
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

    await using page = await this.browserforce.openPage(BASE_PATH);
    await page.locator(BASE_SELECTOR).waitFor();

    for (const assignment of config.homePageLayoutAssignments) {
      const homePageLayoutName = assignment.layout;
      const profile = profiles.records.find(
        (p) => p.Name === assignment.profile
      );
      if (!profile) {
        throw new Error(`could not find profile '${assignment.profile}'`);
      }
      let homePageLayout = homePageLayouts.records.find(
        (l) => l.Name === homePageLayoutName
      );
      if (homePageLayoutName === '') {
        homePageLayout = { Id: 'default', Name: 'default' };
      }
      if (homePageLayout === undefined) {
        throw new Error(
          `Could not find home page layout "${homePageLayoutName}" in list of home page layouts: ${homePageLayouts.records.map(
            (l) => l.Name
          )}`
        );
      }
      const profileSelector = `select[id='${profile.Id!.substring(0, 15)}']`;
      await page
        .locator(profileSelector)
        .selectOption(homePageLayout.Id!.substring(0, 15));
    }

    await page.locator(SAVE_BUTTON_SELECTOR).first().click();
    await Promise.race([
      page.waitForURL((url) => url.pathname === '/setup/forcecomHomepage.apexp'),
      waitForPageErrors(page),
    ]);
  }
}

function compareAssignment(
  a: HomePageLayoutAssignment,
  b: HomePageLayoutAssignment
): number {
  return `${a.profile}:${a.layout}`.localeCompare(
    `${b.profile}:${b.layout}`,
    'en',
    { numeric: true }
  );
}
