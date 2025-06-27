import assert from 'assert';
import { HomePageLayouts } from './index.js';

const tests = [
  {
    description: 'should return no change',
    source: {
      homePageLayoutAssignments: [
        {
          profile: 'Standard User',
          layout: '',
        },
        {
          profile: 'System Administrator',
          layout: '',
        },
      ],
    },
    target: {
      homePageLayoutAssignments: [
        {
          profile: 'Standard User',
          layout: '',
        },
        {
          profile: 'System Administrator',
          layout: '',
        },
      ],
    },
    expected: undefined,
  },
  {
    description: 'should filter irrelevant assignments',
    source: {
      homePageLayoutAssignments: [
        {
          profile: 'Foo User',
          layout: '',
        },
        {
          profile: 'Standard User',
          layout: '',
        },
        {
          profile: 'System Administrator',
          layout: '',
        },
      ],
    },
    target: {
      homePageLayoutAssignments: [
        {
          profile: 'Standard User',
          layout: '',
        },
        {
          profile: 'System Administrator',
          layout: '',
        },
      ],
    },
    expected: undefined,
  },
  {
    description: 'should match when unsorted',
    source: {
      homePageLayoutAssignments: [
        {
          profile: 'System Administrator',
          layout: '',
        },
        {
          profile: 'Standard User',
          layout: '',
        },
      ],
    },
    target: {
      homePageLayoutAssignments: [
        {
          profile: 'Standard User',
          layout: '',
        },
        {
          profile: 'System Administrator',
          layout: '',
        },
      ],
    },
    expected: undefined,
  },
];

describe('HomePageLayouts', () => {
  describe('diff()', () => {
    const p = new HomePageLayouts(global.bf);
    for (const t of tests) {
      it(t.description, () => {
        const actual = p.diff(t.source, t.target);
        assert.deepStrictEqual(actual, t.expected);
      });
    }
  });
});
