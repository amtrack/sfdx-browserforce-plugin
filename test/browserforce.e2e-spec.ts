import { core } from '@salesforce/command';
import * as assert from 'assert';
import Browserforce from '../src/browserforce';

describe('Browser', () => {
  describe('login()', () => {
    it('should successfully login with valid credentials', async function() {
      this.timeout(1000 * 60);
      this.slow(1000 * 10);
      const defaultScratchOrg = await core.Org.create({});
      const bf = new Browserforce(defaultScratchOrg);
      await bf.login();
      await bf.logout();
      assert(true);
    });

    it('should fail login with invalid credentials', async function() {
      this.timeout(1000 * 60);
      this.slow(1000 * 10);
      const fakeOrg = await core.Org.create({});
      fakeOrg.getConnection().accessToken = 'invalid';
      const bf = new Browserforce(fakeOrg);
      await assert.rejects(async () => {
        await bf.login();
      }, /login failed/);
      bf.logout();
    });
  });
});
