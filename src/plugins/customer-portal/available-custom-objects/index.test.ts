import assert from 'assert';
import { type CustomerPortalAvailableCustomObjectsConfig, CustomerPortalAvailableCustomObjects } from './index.js';

type T = {
  description: string;
  source: CustomerPortalAvailableCustomObjectsConfig;
  target: CustomerPortalAvailableCustomObjectsConfig;
  expected: CustomerPortalAvailableCustomObjectsConfig;
};
const tests: T[] = [
  {
    description: 'should only return necessary fields',
    source: [
      {
        _id: 'p1',
        name: 'Dummy',
        available: false,
      },
    ],
    target: [
      {
        name: 'Dummy',
        available: true,
      },
    ],
    expected: [
      {
        _id: 'p1',
        name: 'Dummy',
        available: true,
      },
    ] as CustomerPortalAvailableCustomObjectsConfig,
  },
];

describe('CustomerPortalAvailableCustomObjects', () => {
  describe('diff()', () => {
    const p = new CustomerPortalAvailableCustomObjects(global.browserforce);
    for (const t of tests) {
      it(t.description, () => {
        const actual = p.diff(t.source, t.target);
        assert.deepStrictEqual(actual, t.expected);
      });
    }
  });
});
