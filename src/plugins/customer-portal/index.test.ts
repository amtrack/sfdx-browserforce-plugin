import * as assert from 'assert';
import { CustomerPortal } from '.';

const tests = [
  {
    description: 'should ignore a non-existent target flag',
    source: {
      enabled: true
    },
    target: {},
    expected: {}
  },
  {
    description: 'should ignore a matching target flag',
    source: {
      enabled: true
    },
    target: {
      enabled: true
    },
    expected: {}
  },
  {
    description: 'should detect a changed flag',
    source: {
      enabled: false
    },
    target: {
      enabled: true
    },
    expected: {
      enabled: true
    }
  },
  {
    description: 'should only return necessary fields',
    source: {
      enabled: true,
      portals: [
        {
          name: 'Customer Portal',
          description: 'Customer Portal',
          adminUser: 'User User',
          portalProfileMemberships: [
            {
              name: 'Customer Portal Manager Standard',
              active: true,
              _id: 'a1'
            }
          ],
          _id: 'p1'
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
          description: 'new description',
          _id: 'p1'
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
        assert.deepStrictEqual(actual, t.expected);
      });
    }
  });
});
