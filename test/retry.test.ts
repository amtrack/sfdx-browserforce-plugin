import * as assert from 'assert';
import retry from '../src/plugins/retry';

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
