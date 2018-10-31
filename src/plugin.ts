import { core } from '@salesforce/command';
import { Browser, Page } from 'puppeteer';
import { Action } from './plan';

interface ShapeSchema {
  name: string;
  description: string;
  properties: object;
}

export abstract class ShapePlugin {
  public static schema: ShapeSchema;
  protected static PATHS: object;
  protected browser: Browser;
  protected org: core.Org;
  protected constructor(browser: Browser, org: core.Org) {
    this.browser = browser;
    this.org = org;
  }
  // tslint:disable-next-line:no-any
  public abstract async retrieve(): Promise<any>;
  // tslint:disable-next-line:no-any
  public abstract async apply(actions: Action[]): Promise<any>;
  protected getBaseUrl() {
    return `${this.org.getConnection().instanceUrl}${
      this.constructor['PATHS'].BASE
    }`;
  }
  protected async getPage(): Promise<Page> {
    const page = await this.browser.newPage();
    page.setDefaultNavigationTimeout(
      parseInt(process.env.BROWSERFORCE_NAVIGATION_TIMEOUT_MS, 10) || 90000
    );
    return page;
  }
}
