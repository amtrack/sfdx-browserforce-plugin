import * as assert from 'assert';
import { semanticallyCleanObject } from '../src/plugins/utils';

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
