import { core } from '@salesforce/command';
import * as jsonMergePatch from 'json-merge-patch';
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
  public diff(source, target) {
    return jsonMergePatch.generate(source, target);
  }
  // tslint:disable-next-line:no-any
  public abstract async apply(config: JSON): Promise<any>;
}
