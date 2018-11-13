import { core } from '@salesforce/command';
import Browserforce from './browserforce';

export abstract class ShapePlugin {
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
}
