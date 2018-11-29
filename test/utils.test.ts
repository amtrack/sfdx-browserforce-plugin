import * as assert from 'assert';
import { retry, semanticallyCleanObject } from '../src/plugins/utils';

async function sayHello() {
  return 'hi';
}

let helloCounter = 0;
async function sayHelloOnSecondAttempt() {
  helloCounter++;
  if (helloCounter >= 2) {
    return 'hi';
  }
  throw new Error('not yet');
}

describe('retry', () => {
  it('should return on first try', async function() {
    const res = await retry(sayHello);
    assert.deepStrictEqual(res, 'hi');
  });
  it('should return on second try', async function() {
    const res = await retry(sayHelloOnSecondAttempt);
    assert.deepStrictEqual(res, 'hi');
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
