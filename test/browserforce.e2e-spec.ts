import { core, UX } from '@salesforce/command';
import * as assert from 'assert';
import Browserforce from '../src/browserforce';

describe('Browser', () => {
  describe('login()', () => {
    it('should successfully login with valid credentials', async function() {
      this.timeout(1000 * 300);
      this.slow(1000 * 30);
      const defaultScratchOrg = await core.Org.create({});
      const ux = await UX.create();
      const bf = new Browserforce(defaultScratchOrg, ux.cli);
      await bf.login();
      await bf.logout();
      assert(true);
    });

    it('should fail login with invalid credentials', async function() {
      this.timeout(1000 * 300);
      this.slow(1000 * 30);
      const fakeOrg = await core.Org.create({});
      fakeOrg.getConnection().accessToken = 'invalid';
      const ux = await UX.create();
      const bf = new Browserforce(fakeOrg, ux.cli);
      await assert.rejects(async () => {
        await bf.login();
      }, /login failed/);
      bf.logout();
    });
  });
});
