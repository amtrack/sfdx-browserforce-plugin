import { Org } from '@salesforce/core';
import * as jsonMergePatch from 'json-merge-patch';
import { Browserforce } from './browserforce';
import { isEmpty } from './plugins/utils';

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
  public async run(plan: unknown): Promise<unknown> {
    const state = await this.retrieve(plan);
    const diff = this.diff(state, plan);
    const needsAction = !isEmpty(diff);
    if (needsAction) {
      const result = await this.apply(diff);
      return result;
    }
    return {
      message: 'no action necessary'
    };
  }
}
