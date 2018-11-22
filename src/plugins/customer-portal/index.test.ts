import * as assert from 'assert';
import CustomerPortal from '.';

const tests = [
  {
    description: 'should ignore a non-existent target flag',
    source: {
      enableCustomerPortal: true
    },
    target: {},
    expected: {}
  },
  {
    description: 'should ignore a matching target flag',
    source: {
      enableCustomerPortal: true
    },
    target: {
      enableCustomerPortal: true
    },
    expected: {}
  },
  {
    description: 'should detect a changed flag',
    source: {
      enableCustomerPortal: false
    },
    target: {
      enableCustomerPortal: true
    },
    expected: {
      enableCustomerPortal: true
    }
  }
];

describe('CustomerPortal', () => {
  describe('diff()', () => {
    const p = new CustomerPortal(null, null);
    for (const t of tests) {
      it(t.description, () => {
        const actual = p.diff(t.source, t.target);
        assert.deepEqual(
          actual,
          t.expected,
          JSON.stringify({
            t,
            actual
          })
        );
      });
    }
  });
});
