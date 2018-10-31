import * as assert from 'assert';
import Plan from '../src/plan';

describe('Plan', () => {
  describe('plan()', () => {
    it('should return no actions', () => {
      const schema = {
        properties: {
          foo: {
            name: 'foo'
          }
        }
      };
      const state = {
        foo: 'bar'
      };
      const target = {
        foo: 'bar'
      };
      assert.deepEqual(Plan.plan(schema, state, target), []);
    });
    it('should return an action', () => {
      const schema = {
        properties: {
          foo: {
            name: 'foo'
          }
        }
      };
      const state = {
        foo: 'bar'
      };
      const target = {
        foo: 'baz'
      };
      assert.deepEqual(Plan.plan(schema, state, target), [
        {
          name: 'foo',
          oldValue: 'bar',
          targetValue: 'baz'
        }
      ]);
    });
  });
});
