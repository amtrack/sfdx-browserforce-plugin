import assert from 'assert';
import { isEmptyObjectOrArray, semanticallyCleanObject } from '../src/plugins/utils.js';

describe('semanticallyCleanObject', () => {
  it('should clean object', async () => {
    assert.deepStrictEqual(semanticallyCleanObject({ id: 'a2' }), undefined);
  });
  it('should clean object with custom id', async () => {
    assert.deepStrictEqual(semanticallyCleanObject({ myid: 'a2' }, 'myid'), undefined);
  });
  it('should return object as is', async () => {
    assert.deepStrictEqual(semanticallyCleanObject({ id: 'a2', a: 'hi' }), {
      id: 'a2',
      a: 'hi',
    });
  });
  it('should return object as is with custom id', async () => {
    assert.deepStrictEqual(semanticallyCleanObject({ myid: 'a2', a: 'hi' }, 'myid'), { myid: 'a2', a: 'hi' });
  });
});

describe('isEmptyObjectOrArray', () => {
  const shouldBeEmpty: unknown[] = [[], {}];
  const shouldNotBeEmpty: unknown[] = [true, false, 'foo', { foo: 'bar' }, ['bar'], '', undefined, null];
  for (const t of shouldBeEmpty) {
    it(`${t} should be empty`, () => assert.ok(isEmptyObjectOrArray(t)));
  }
  for (const t of shouldNotBeEmpty) {
    it(`${t} should not be empty`, () => assert.ok(!isEmptyObjectOrArray(t)));
  }
});
