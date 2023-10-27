import assert from 'assert';
import { type Config, CustomerPortalAvailableCustomObjects } from '.';

type T = {
  description: string;
  source: Config;
  target: Config;
  expected: Config;
};
const tests: T[] = [
  {
    description: 'should only return necessary fields',
    source: [
      {
        _id: 'p1',
        name: 'Dummy',
        available: false
      }
    ],
    target: [
      {
        name: 'Dummy',
        available: true
      }
    ],
    expected: [
      {
        _id: 'p1',
        name: 'Dummy',
        available: true
      }
    ] as Config
  }
];

describe('CustomerPortalAvailableCustomObjects', () => {
  describe('diff()', () => {
    const p = new CustomerPortalAvailableCustomObjects(global.bf);
    for (const t of tests) {
      it(t.description, () => {
        const actual = p.diff(t.source, t.target);
        assert.deepStrictEqual(actual, t.expected);
      });
    }
  });
});
