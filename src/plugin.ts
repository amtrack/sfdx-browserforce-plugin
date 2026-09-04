import { Browserforce } from './browserforce.js';
import { deepDiff } from './plugins/utils.js';

export abstract class BrowserforcePlugin {
  protected browserforce: Browserforce;

  public constructor(browserforce: Browserforce) {
    this.browserforce = browserforce;
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

/**
 * Composes a plugin class out of named sub-plugins, one per field of `T`.
 * Generates retrieve/diff/apply that fan out to each sub-plugin whose key
 * is present in the definition/state/plan, instead of hand-writing the
 * same per-field loop in every composed plugin.
 */
export function composePlugin<T extends Record<string, object | undefined>>(
  name: string,
  subPlugins: { [K in keyof T]: new (browserforce: Browserforce) => BrowserforcePlugin },
): new (browserforce: Browserforce) => BrowserforcePlugin {
  const keys = Object.keys(subPlugins) as (keyof T)[];
  const Composed = class extends BrowserforcePlugin {
    public async retrieve(definition: Partial<T> = {}): Promise<Partial<T>> {
      const response: Partial<T> = {};
      for (const key of keys) {
        if (definition[key]) {
          const plugin = new subPlugins[key](this.browserforce);
          response[key] = (await plugin.retrieve(definition[key])) as T[typeof key];
        }
      }
      return response;
    }
    public diff(state: Partial<T>, definition: Partial<T>): Partial<T> | undefined {
      const response: Partial<T> = {};
      for (const key of keys) {
        const plugin = new subPlugins[key](this.browserforce);
        const fieldDiff = plugin.diff(state[key], definition[key]) as T[typeof key] | undefined;
        if (fieldDiff !== undefined) {
          response[key] = fieldDiff;
        }
      }
      return Object.keys(response).length ? response : undefined;
    }
    public async apply(plan: Partial<T>): Promise<void> {
      for (const key of keys) {
        if (plan[key]) {
          const plugin = new subPlugins[key](this.browserforce);
          await plugin.apply(plan[key]);
        }
      }
    }
  };
  Object.defineProperty(Composed, 'name', { value: name });
  return Composed;
}
