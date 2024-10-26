import assert from 'assert';
import { CustomerPortalEnable as CustomerPortalEnabled } from './index.js';

type T = {
  description: string;
  source: boolean;
  target?: boolean;
  expected?: boolean;
};

const tests: T[] = [
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
    const p = new CustomerPortalEnabled(global.bf);
    for (const t of tests) {
      it(t.description, () => {
        const actual = p.diff(t.source, t.target);
        assert.deepStrictEqual(actual, t.expected);
      });
    }
  });
});
