import { Org } from '@salesforce/core';
import * as jsonMergePatch from 'json-merge-patch';
import { Browserforce } from './browserforce';

export abstract class BrowserforcePlugin {
  protected org: Org;
  protected browserforce: Browserforce;

  public constructor(browserforce: Browserforce, org: Org) {
    this.browserforce = browserforce;
    this.org = org;
  }
  public abstract retrieve(definition?: unknown): Promise<unknown>;
  public diff(state: unknown, definition: unknown): unknown {
    return jsonMergePatch.generate(state, definition);
  }
  public abstract apply(plan: unknown): Promise<unknown>;
}
