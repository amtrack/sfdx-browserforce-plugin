import * as assert from 'assert';
import CustomerPortalAvailableCustomObjects from '.';

const tests = [
  {
    description: 'should only return necessary fields',
    source: [
      {
        id: 'p1',
        name: 'Dummy',
        namespacePrefix: null,
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
        id: 'p1',
        available: true
      }
    ]
  }
];

describe('CustomerPortalAvailableCustomObjects', () => {
  describe('diff()', () => {
    const p = new CustomerPortalAvailableCustomObjects(null, null);
    for (const t of tests) {
      it(t.description, () => {
        const actual = p.diff(t.source, t.target);
        assert.deepEqual(actual, t.expected);
      });
    }
  });
});
