import assert from 'assert';
import { CustomerPortalSetup } from './index.js';

const tests = [
  {
    description: 'should only return necessary portal fields',
    source: [
      {
        _id: 'p1',
        name: 'Customer Portal',
        description: 'Customer Portal',
        adminUser: 'User User',
        isSelfRegistrationActivated: true,
        selfRegUserDefaultLicense: 'Customer Portal Manager Custom',
        selfRegUserDefaultRole: 'User',
        selfRegUserDefaultProfile: 'Customer Portal Manager Custom',
      },
    ],
    target: [
      {
        name: 'Customer Portal',
        description: 'new description',
      },
    ],
    expected: [
      {
        _id: 'p1',
        name: 'Customer Portal',
        description: 'new description',
      },
    ],
  },
  {
    description:
      'should only return portal and portalProfileMemberships fields',
    source: [
      {
        name: 'Customer Portal',
        description: 'Customer Portal',
        adminUser: 'User User',
        portalProfileMemberships: [
          {
            name: 'Customer Portal Manager Standard',
            active: true,
            _id: 'a1',
          },
        ],
        _id: 'p1',
      },
    ],
    target: [
      {
        name: 'Customer Portal',
        portalProfileMemberships: [
          {
            name: 'Customer Portal Manager Standard',
            active: false,
          },
        ],
      },
    ],
    expected: [
      {
        _id: 'p1',
        name: 'Customer Portal',
        portalProfileMemberships: [
          {
            _id: 'a1',
            name: 'Customer Portal Manager Standard',
            active: false,
          },
        ],
      },
    ],
  },
  {
    description: 'should detect a renamed portal',
    source: [
      {
        name: 'Customer Portal',
        description: 'Customer Portal',
        adminUser: 'User User',
        portalProfileMemberships: [],
        _id: 'p1',
      },
    ],
    target: [
      {
        name: 'Foo Portal',
        oldName: 'Customer Portal',
      },
    ],
    expected: [
      {
        _id: 'p1',
        name: 'Foo Portal',
      },
    ],
  },
  {
    description: 'should return no change',
    source: [
      {
        name: 'Customer Portal',
        description: 'Customer Portal',
        adminUser: 'User User',
        portalProfileMemberships: [
          {
            name: 'Customer Portal Manager Standard',
            active: true,
            _id: 'a1',
          },
        ],
        _id: 'p1',
      },
    ],
    target: [
      {
        name: 'Customer Portal',
        portalProfileMemberships: [
          {
            name: 'Customer Portal Manager Standard',
            active: true,
          },
        ],
      },
    ],
    expected: undefined,
  },
];

describe('CustomerPortalSetup', () => {
  describe('diff()', () => {
    const p = new CustomerPortalSetup(global.bf);
    for (const t of tests) {
      it(t.description, () => {
        const actual = p.diff(t.source, t.target);
        assert.deepStrictEqual(actual, t.expected);
      });
    }
  });
});
