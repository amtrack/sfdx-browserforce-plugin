import { Org } from '@salesforce/core';
import { Ux } from '@salesforce/sf-plugins-core';
import assert from 'assert';
import type { Page } from 'playwright';
import { Browserforce } from '../src/browserforce.js';

describe('Browserforce', function () {
  this.slow('30s');
  this.timeout('2m');
  describe('login()', () => {
    it('should successfully login with valid credentials', async () => {
      // handled by e2e-setup.ts
      assert.ok(true);
    });
    it('should fail login with invalid credentials', async () => {
      const org = await Org.create({});
      const conn = org.getConnection();
      conn.logout();
      conn.accessToken = 'invalid';
      conn.refreshToken = 'invalid';
      const ux = new Ux();
      const bf = new Browserforce(org, ux);
      await assert.rejects(async () => {
        await bf.login();
      });
      await bf.logout();
    });
  });
  describe('getMyDomain()', () => {
    it('should determine a my domain for a scratch org', async () => {
      const myDomain = global.bf.getMyDomain();
      assert.notDeepStrictEqual(myDomain, null);
    });
  });
  describe('waitForSelectorInFrameOrPage()', () => {
    it('should query a selector in LEX and Classic UI', async () => {
      const page: Page = await global.bf.openPage(
        'lightning/setup/ExternalStrings/home'
      );
      const frame = await global.bf.waitForSelectorInFrameOrPage(
        page,
        'input[name="edit"]'
      );
      await frame.locator('input[name="edit"]').click();
      // lightning/setup/ExternalStrings/home
      // ->
      // lightning/setup/ExternalStrings/page?address=/101/e
      await page.waitForURL((url) => url.searchParams.has('address'));
      await page.close();
    });
  });
  describe('openPage()', () => {
    it('should throw the page error on internal errors', async () => {
      process.env.BROWSERFORCE_RETRY_TIMEOUT_MS = '0';
      await assert.rejects(async () => {
        await global.bf.openPage(
          '_ui/common/config/field/StandardFieldAttributes/d?type=Account&id=INVALID_Name'
        );
      }, /Insufficient Privileges/);
      delete process.env.BROWSERFORCE_RETRY_TIMEOUT_MS;
    });
    it('should not throw any error opening a page', async () => {
      const page = await global.bf.openPage(
        '_ui/common/config/field/StandardFieldAttributes/d?type=Account&id=Name'
      );
      await page.close();
    });
  });
});
