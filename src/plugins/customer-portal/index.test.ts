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
  },
  {
    description: 'should only return necessary fields',
    source: {
      enableCustomerPortal: true,
      portals: [
        {
          name: 'Customer Portal',
          description: 'Customer Portal',
          adminUser: 'User User',
          portalProfileMemberships: [
            {
              name: 'Customer Portal Manager Standard',
              active: true,
              id: 'a1'
            }
          ],
          id: 'p1'
        }
      ]
    },
    target: {
      portals: [
        {
          name: 'Customer Portal',
          description: 'new description'
        }
      ]
    },
    expected: {
      portals: [
        {
          name: 'Customer Portal',
          description: 'new description',
          id: 'p1'
        }
      ]
    }
  }
];

describe('CustomerPortal', () => {
  describe('diff()', () => {
    const p = new CustomerPortal(null, null);
    for (const t of tests) {
      it(t.description, () => {
        const actual = p.diff(t.source, t.target);
        assert.deepEqual(actual, t.expected);
      });
    }
  });
});
