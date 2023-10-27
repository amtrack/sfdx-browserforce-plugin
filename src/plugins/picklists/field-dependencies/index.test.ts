import assert from 'assert';
import { Config } from '.';
import { deepDiff } from '../../utils';

type T = {
  description: string;
  source: Config;
  target: Config;
  expected: Config | undefined;
};
const tests: T[] = [
  {
    description: 'should return no change',
    source: [
      {
        object: 'Vehicle__c',
        dependentField: 'Gears__c',
        controllingField: null
      }
    ],
    target: [
      {
        object: 'Vehicle__c',
        dependentField: 'Gears__c',
        controllingField: null
      }
    ],
    expected: undefined
  },
  {
    description: 'should unset controlling field',
    source: [
      {
        object: 'Vehicle__c',
        dependentField: 'Gears__c',
        controllingField: 'Foo__c'
      }
    ],
    target: [
      {
        object: 'Vehicle__c',
        dependentField: 'Gears__c',
        controllingField: null
      }
    ],
    expected: [
      {
        object: 'Vehicle__c',
        dependentField: 'Gears__c',
        controllingField: null
      }
    ]
  }
];

describe('FieldDependencies', () => {
  describe('diff()', () => {
    // const p = new FieldDependencies(global.bf);
    // for (const t of tests) {
    //   it(t.description, () => {
    //     const actual = p.diff(t.source, t.target);
    //     assert.deepStrictEqual(actual, t.expected);
    //   });
    // }
    for (const t of tests) {
      it(t.description, () => {
        const actual = deepDiff(t.source, t.target);
        assert.deepStrictEqual(actual, t.expected);
      });
    }
  });
});
