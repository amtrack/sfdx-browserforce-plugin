import { core } from '@salesforce/command';
import Browserforce from './browserforce';

interface ShapeSchema {
  name: string;
  description: string;
  properties: object;
}

export abstract class ShapePlugin {
  public static schema: ShapeSchema;
  protected static PATHS: object;
  protected org: core.Org;
  protected browserforce: Browserforce;

  protected constructor(browserforce: Browserforce, org: core.Org) {
    this.browserforce = browserforce;
    this.org = org;
  }
  // tslint:disable-next-line:no-any
  public abstract async retrieve(): Promise<any>;
  // tslint:disable-next-line:no-any
  public abstract async apply(config: JSON): Promise<any>;
  protected getBaseUrl() {
    return `${this.org.getConnection().instanceUrl}${
      this.constructor['PATHS'].BASE
    }`;
  }
}
