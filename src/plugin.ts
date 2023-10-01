import { Org } from '@salesforce/core';
import * as jsonMergePatch from 'json-merge-patch';
import { Browserforce } from './browserforce';

export abstract class BrowserforcePlugin {
  protected browserforce: Browserforce;
  protected org: Org;

  public constructor(browserforce: Browserforce) {
    this.browserforce = browserforce;
    this.org = browserforce?.org;
  }
  public abstract retrieve(definition?: unknown): Promise<unknown>;
  public diff(state: unknown, definition: unknown): unknown {
    return jsonMergePatch.generate(state, definition);
  }
  public abstract apply(plan: unknown): Promise<unknown>;
}
