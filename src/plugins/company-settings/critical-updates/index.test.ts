import * as assert from 'assert';
import CriticalUpdates from '.';

interface TestData {
  name: string | string[];
  active: boolean;
  comment?: string;
}
interface Test {
  description: string;
  source: TestData[];
  target: TestData[];
  expected: TestData[];
  skip?: boolean;
}

const tests: Test[] = [
  {
    description: 'should return no change',
    source: [
      {
        name: 'Update 1',
        active: true
      },
      {
        name: 'Update 2',
        active: true
      },
      {
        name: 'Update 3',
        active: true
      }
    ],
    target: [
      {
        name: 'Update 2',
        active: true,
        comment: 'This is a comment'
      }
    ],
    expected: []
  },
  {
    description: 'should match a specific item',
    source: [
      {
        name: 'Update 1',
        active: false
      },
      {
        name: 'Update 2',
        active: false
      },
      {
        name: 'Update 3',
        active: false
      }
    ],
    target: [
      {
        name: 'Update 2',
        active: true,
        comment: 'This is a comment'
      }
    ],
    expected: [
      {
        name: 'Update 2',
        active: true,
        comment: 'This is a comment'
      }
    ]
  },
  {
    description: 'should match all inactive items',
    source: [
      {
        name: 'Update 1',
        active: true
      },
      {
        name: 'Update 2',
        active: false
      },
      {
        name: 'Update 3',
        active: true
      }
    ],
    target: [
      {
        name: '*',
        active: true,
        comment: 'This is a comment'
      }
    ],
    expected: [
      {
        name: 'Update 2',
        active: true,
        comment: 'This is a comment'
      }
    ]
  },
  {
    description: 'should handle multiple patterns',
    source: [
      {
        name: 'Update 1',
        active: false
      },
      {
        name: 'Update 2',
        active: false
      },
      {
        name: 'Update 3',
        active: false
      }
    ],
    target: [
      {
        name: ['*', '!Update 2'],
        active: true,
        comment: 'This is a comment'
      }
    ],
    expected: [
      {
        name: 'Update 1',
        active: true,
        comment: 'This is a comment'
      },
      {
        name: 'Update 3',
        active: true,
        comment: 'This is a comment'
      }
    ]
  }
];

describe('CriticalUpdates', () => {
  describe('diff()', () => {
    const p = new CriticalUpdates(null, null);
    for (const t of tests) {
      (t.skip ? it.skip : it)(t.description, () => {
        const actual = p.diff(t.source, t.target);
        assert.deepEqual(actual, t.expected);
      });
    }
  });
});
