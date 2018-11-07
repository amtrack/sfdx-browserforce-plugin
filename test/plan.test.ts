import * as assert from 'assert';
import Plan from '../src/plan';

describe('Plan', () => {
  describe('plan()', () => {
    it('should return no actions', () => {
      const state = {
        foo: 'bar'
      };
      const target = {
        foo: 'bar'
      };
      assert.deepEqual(Plan.plan(state, target), undefined);
    });
    it('should return an action', () => {
      const state = {
        foo: 'bar'
      };
      const target = {
        foo: 'baz'
      };
      assert.deepEqual(Plan.plan(state, target), {
        foo: 'baz'
      });
    });
  });
});
