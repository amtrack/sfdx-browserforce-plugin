import assert from 'assert';
import { BrowserforcePlugin } from '../src/plugin';

class DummyPlugin extends BrowserforcePlugin {
  public async retrieve(definition: JSON) {
    return definition;
  }
  public async apply(config: JSON) {
    return config;
  }
}

describe('BrowserforcePlugin', () => {
  describe('#diff()', async () => {
    it('generates a diff for a simple object', async () => {
      const plugin = new DummyPlugin(null, null);
      const actions = plugin.diff({ a: 1 }, { a: 2 });
      assert.deepStrictEqual(actions, { a: 2 });
    });
    it('generates a diff for a deep object', async () => {
      const plugin = new DummyPlugin(null, null);
      const actions = plugin.diff(
        {
          a: [
            {
              a: 1
            }
          ]
        },
        { a: [{ a: 2 }] }
      );
      assert.deepStrictEqual(actions, { a: [{ a: 2 }] });
    });
    it('generates a diff for a deep object', async () => {
      const plugin = new DummyPlugin(null, null);
      const actions = plugin.diff(
        {
          a: [
            {
              a: 1
            },
            {
              a: 2
            }
          ]
        },
        {
          a: [
            {
              a: 2,
              b: true
            }
          ]
        }
      );
      assert.deepStrictEqual(actions, { a: [{ a: 2, b: true }] });
    });
    it('generates a diff for an array', async () => {
      const plugin = new DummyPlugin(null, null);
      const actions = plugin.diff(
        [
          {
            a: 1
          }
        ],
        [{ a: 2 }]
      );
      assert.deepStrictEqual(actions, [{ a: 2 }]);
    });
  });
});
