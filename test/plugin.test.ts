import assert from 'assert';
import { BrowserforcePlugin } from '../src/plugin.js';

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
    const plugin = new DummyPlugin(global.bf);
    const tests: [description: string, input: [state: unknown, definition: unknown], expected: unknown][] = [
      ['should return target for simple value', [false, true], true],
      ['should return target for simple string', [undefined, ''], ''],
      ['should return target number vs undefined', [1, undefined], undefined],
      ['should return target for simple string', [null, ''], ''],
      ['should return target keys only', [{ a: 1 }, { a: 2 }], { a: 2 }],
      ['should only keep the object keys of the target', [{ a: 1, b: 1 }, { a: 2 }], { a: 2 }],
      ['should recursively compare', [{ a: 1, b: 1 }, { a: 1 }], undefined],
      [
        'should allow unsetting via undefined/null/ or empty string',
        [
          { a: 1, n: 1, u: 1, s: 'foo' },
          { a: 2, n: null, u: undefined, s: '' }
        ],
        { a: 2, n: null, u: undefined, s: '' }
      ],
      [
        'should allow unsetting via undefined/null/ or empty string in an array',
        [[{ a: 1, n: 1, u: 1, s: 'foo' }], [{ a: 2, n: null, u: undefined, s: '' }]],
        [{ a: 2, n: null, u: undefined, s: '' }]
      ],
      ['should allow unsetting via null in an array', [[{ a: 1, n: 1 }], [{ a: 1, n: null }]], [{ a: 1, n: null }]],
      [
        'generates a diff for a deep object',
        [
          {
            a: [
              {
                a: 1
              }
            ]
          },
          { a: [{ a: 2 }] }
        ],
        { a: [{ a: 2 }] }
      ],
      [
        'compares arrays of different lengths by index',
        [
          {
            a: [
              {
                a: 1,
                c: 'foo'
              },
              {
                a: 2,
                c: 'baz'
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
        ],
        { a: [{ a: 2, b: true }] }
      ],
      [
        'generates a diff for an array',
        [
          [
            {
              a: 1,
              b: 'foo'
            }
          ],
          [
            {
              a: 2
            }
          ]
        ],
        [{ a: 2 }]
      ]
    ];
    for (const t of tests) {
      it(t[0], () => {
        const diff = plugin.diff(...t[1]);
        assert.deepStrictEqual(diff, t[2]);
      });
    }
  });
});
