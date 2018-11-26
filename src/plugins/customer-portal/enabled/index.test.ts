import * as assert from 'assert';
import CustomerPortalEnabled from '.';

const tests = [
  {
    description: 'should ignore a non-existent target flag',
    source: true,
    target: undefined,
    expected: undefined
  },
  {
    description: 'should ignore a matching target flag',
    source: true,
    target: true,
    expected: undefined
  },
  {
    description: 'should detect a changed flag',
    source: false,
    target: true,
    expected: true
  }
];

describe('CustomerPortalEnabled', () => {
  describe('diff()', () => {
    const p = new CustomerPortalEnabled(null, null);
    for (const t of tests) {
      it(t.description, () => {
        const actual = p.diff(t.source, t.target);
        assert.deepEqual(actual, t.expected);
      });
    }
  });
});
