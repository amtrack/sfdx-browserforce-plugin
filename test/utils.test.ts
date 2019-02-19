import * as assert from 'assert';
import { retry, semanticallyCleanObject } from '../src/plugins/utils';

async function sayHello() {
  return 'hi';
}

describe('retry', () => {
  it('should return on first try', async function() {
    const res = await retry(sayHello);
    assert.deepStrictEqual(res, 'hi');
  });
  it('should return on third try', async function() {
    let helloCounter = 0;
    const res = await retry(async function() {
      helloCounter++;
      if (helloCounter >= 3) {
        return 'hi';
      }
      throw new Error('not yet');
    });
    assert.deepStrictEqual(res, 'hi');
    assert.deepEqual(helloCounter, 3);
  });
  it('should return on third try for specific error', async function() {
    class FooError extends Error {};
    let helloCounter = 0;
    const res = await retry(async function() {
      helloCounter++;
      if (helloCounter >= 3) {
        return 'hi';
      }
      throw new FooError('not yet');
    }, 5, 1000, false, 'FooError');
    assert.deepStrictEqual(res, 'hi');
    assert.deepEqual(helloCounter, 3);
  });
});

describe('semanticallyCleanObject', () => {
  it('should clean object', async function() {
    assert.deepStrictEqual(semanticallyCleanObject({ id: 'a2' }), null);
  });
  it('should clean object with custom id', async function() {
    assert.deepStrictEqual(
      semanticallyCleanObject({ myid: 'a2' }, 'myid'),
      null
    );
  });
  it('should return object as is', async function() {
    assert.deepStrictEqual(semanticallyCleanObject({ id: 'a2', a: 'hi' }), {
      id: 'a2',
      a: 'hi'
    });
  });
  it('should return object as is with custom id', async function() {
    assert.deepStrictEqual(
      semanticallyCleanObject({ myid: 'a2', a: 'hi' }, 'myid'),
      { myid: 'a2', a: 'hi' }
    );
  });
});
