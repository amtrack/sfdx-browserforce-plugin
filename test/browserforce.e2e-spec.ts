import { Ux } from '@salesforce/sf-plugins-core';
import { Org } from '@salesforce/core';
import assert from 'assert';
import { Browserforce } from '../src/browserforce';

describe('Browser', function () {
  describe('login()', () => {
    it('should successfully login with valid credentials', async () => {
      // handled by e2e-setup.ts
      assert.ok(true);
    });

    it('should fail login with invalid credentials', async () => {
      const fakeOrg = await Org.create({});
      fakeOrg.getConnection().accessToken = 'invalid';
      const ux = new Ux();
      const bf = new Browserforce(fakeOrg, ux);
      await assert.rejects(async () => {
        await bf.login();
      }, /login failed/);
      bf.logout();
    });
  });
  describe('getMyDomain()', () => {
    it('should determine a my domain for a scratch org', async () => {
      const myDomain = global.bf.getMyDomain();
      assert.notDeepStrictEqual(null, myDomain);
    });
  });
  describe('getInstanceDomain()', () => {
    it('should determine an instance domain for a scratch org with my domain', async () => {
      const instanceDomain = global.bf.getInstanceDomain();
      assert.notDeepStrictEqual(null, instanceDomain);
    });
  });
  describe('getLightningUrl()', () => {
    it('should determine a LEX URL for a scratch org with my domain', async () => {
      const lexUrl = global.bf.getLightningUrl();
      assert.notDeepStrictEqual(null, lexUrl);
    });
  });
  describe('waitForSelectorInFrameOrPage()', () => {
    it('should query a selector in LEX and Classic UI', async () => {
      const page = await global.bf.openPage('lightning/setup/ExternalStrings/home');
      const frame = await global.bf.waitForSelectorInFrameOrPage(page, 'input[name="edit"]');
      await Promise.all([page.waitForNavigation(), frame.click('input[name="edit"]')]);
    });
  });
  describe('throwPageErrors()', () => {
    it('should throw the page error on internal errors', async () => {
      process.env.BROWSERFORCE_RETRY_TIMEOUT_MS = '0';
      await assert.rejects(async () => {
        await global.bf.openPage('_ui/common/config/field/StandardFieldAttributes/d?type=Account&id=INVALID_Name');
      }, /Insufficient Privileges/);
      delete process.env.BROWSERFORCE_RETRY_TIMEOUT_MS;
    });
    it('should not throw any error opening a page', async () => {
      await global.bf.openPage('_ui/common/config/field/StandardFieldAttributes/d?type=Account&id=Name');
    });
  });
});
