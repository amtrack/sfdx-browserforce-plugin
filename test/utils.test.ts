import assert from 'assert';
import { isEmpty, semanticallyCleanObject } from '../src/plugins/utils';

describe('semanticallyCleanObject', () => {
  it('should clean object', async () => {
    assert.deepStrictEqual(semanticallyCleanObject({ id: 'a2' }), null);
  });
  it('should clean object with custom id', async () => {
    assert.deepStrictEqual(
      semanticallyCleanObject({ myid: 'a2' }, 'myid'),
      null
    );
  });
  it('should return object as is', async () => {
    assert.deepStrictEqual(semanticallyCleanObject({ id: 'a2', a: 'hi' }), {
      id: 'a2',
      a: 'hi'
    });
  });
  it('should return object as is with custom id', async () => {
    assert.deepStrictEqual(
      semanticallyCleanObject({ myid: 'a2', a: 'hi' }, 'myid'),
      { myid: 'a2', a: 'hi' }
    );
  });
});

describe('isEmpty', () => {
  it('boolean should not be empty', async () => {
    assert.deepStrictEqual(isEmpty(false), false);
  });
  it('string should not be empty', async () => {
    assert.deepStrictEqual(isEmpty('foo'), false);
  });
  it('string should not be empty', async () => {
    assert.deepStrictEqual(isEmpty('foo'), false);
  });
  it('non-empty object should not be empty', async () => {
    assert.deepStrictEqual(isEmpty({ foo: 'bar' }), false);
  });
  it('non-empty array should not be empty', async () => {
    assert.deepStrictEqual(isEmpty(['bar']), false);
  });
  it('empty string should be empty', async () => {
    assert.deepStrictEqual(isEmpty(''), false);
  });
  it('empty object should be empty', async () => {
    assert.deepStrictEqual(isEmpty({}), true);
  });
  it('empty array should be empty', async () => {
    assert.deepStrictEqual(isEmpty([]), true);
  });
});
