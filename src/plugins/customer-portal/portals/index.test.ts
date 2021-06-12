import * as assert from 'assert';
import { CustomerPortalSetup } from '.';

const tests = [
  {
    description: 'should only return necessary portal fields',
    source: [
      {
        id: 'p1',
        name: 'Customer Portal',
        description: 'Customer Portal',
        adminUser: 'User User',
        isSelfRegistrationActivated: true,
        selfRegUserDefaultLicense: 'Customer Portal Manager Custom',
        selfRegUserDefaultRole: 'User',
        selfRegUserDefaultProfile: 'Customer Portal Manager Custom'
      }
    ],
    target: [
      {
        name: 'Customer Portal',
        description: 'new description'
      }
    ],
    expected: [
      {
        id: 'p1',
        description: 'new description'
      }
    ]
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
            id: 'a1'
          }
        ],
        id: 'p1'
      }
    ],
    target: [
      {
        name: 'Customer Portal',
        portalProfileMemberships: [
          {
            name: 'Customer Portal Manager Standard',
            active: false
          }
        ]
      }
    ],
    expected: [
      {
        id: 'p1',
        portalProfileMemberships: [
          {
            id: 'a1',
            active: false
          }
        ]
      }
    ]
  },
  {
    description: 'should detect a renamed portal',
    source: [
      {
        name: 'Customer Portal',
        description: 'Customer Portal',
        adminUser: 'User User',
        portalProfileMemberships: [],
        id: 'p1'
      }
    ],
    target: [
      {
        name: 'Foo Portal',
        oldName: 'Customer Portal'
      }
    ],
    expected: [
      {
        id: 'p1',
        name: 'Foo Portal'
      }
    ]
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
            id: 'a1'
          }
        ],
        id: 'p1'
      }
    ],
    target: [
      {
        name: 'Customer Portal',
        portalProfileMemberships: [
          {
            name: 'Customer Portal Manager Standard',
            active: true
          }
        ]
      }
    ],
    expected: []
  }
];

describe('CustomerPortalSetup', () => {
  describe('diff()', () => {
    const p = new CustomerPortalSetup(null, null);
    for (const t of tests) {
      it(t.description, () => {
        const actual = p.diff(t.source, t.target);
        assert.deepStrictEqual(actual, t.expected);
      });
    }
  });
});
