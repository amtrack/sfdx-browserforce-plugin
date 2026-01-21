import { Browserforce } from './browserforce.js';
import { deepDiff } from './plugins/utils.js';

export abstract class BrowserforcePlugin {
  protected browserforce: Browserforce;

  public constructor(browserforce: Browserforce) {
    this.browserforce = browserforce;
    this.org = browserforce?.org;
  }
  public abstract retrieve(definition?: unknown): Promise<unknown>;
  /**
   * deep diff
   * @param state
   * @param definition
   * @returns undefined when there is no diff
   */
  public diff(state: unknown, definition: unknown): unknown {
    return deepDiff(state, definition);
  }
  public abstract apply(plan: unknown): Promise<unknown>;
  public async run(definition: unknown): Promise<unknown> {
    const state = await this.retrieve(definition);
    const diff = this.diff(state, definition);
    if (diff !== undefined) {
      const result = await this.apply(diff);
      return result;
    }
    return {
      message: 'no action necessary',
    };
  }
}
