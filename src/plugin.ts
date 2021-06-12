import { core } from '@salesforce/command';
import * as jsonMergePatch from 'json-merge-patch';
import { Browserforce } from './browserforce';

export abstract class BrowserforcePlugin {
  protected org: core.Org;
  protected browserforce: Browserforce;

  public constructor(browserforce: Browserforce, org: core.Org) {
    this.browserforce = browserforce;
    this.org = org;
  }
  public abstract retrieve(definition?): Promise<any>;
  public diff(state, definition) {
    return jsonMergePatch.generate(state, definition);
  }
  public abstract apply(plan: JSON): Promise<any>;
}
