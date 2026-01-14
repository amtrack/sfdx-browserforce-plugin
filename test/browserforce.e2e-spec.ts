import { AuthInfo, Connection } from '@salesforce/core';
import assert from 'assert';
import { Browserforce } from '../src/browserforce.js';

describe('Browserforce', function () {
  this.slow('30s');
  this.timeout('2m');
  describe('login()', () => {
    it('should fail login with invalid credentials', async () => {
      const invalidConnection = new Connection({
        authInfo: new AuthInfo({}),
      });
      await using extraBrowserContext = await global.browserforce.browserContext.browser().newContext();
      const browserforce = new Browserforce(invalidConnection, extraBrowserContext);
      await assert.rejects(async () => {
        await browserforce.login();
      });
    });
  });
  describe('getMyDomain()', () => {
    it('should determine a my domain for a scratch org', async () => {
      const myDomain = global.browserforce.getMyDomain();
      assert.notDeepStrictEqual(myDomain, null);
    });
  });
  describe('waitForSelectorInFrameOrPage()', () => {
    it('should query a selector in LEX and Classic UI', async () => {
      await using page = await global.browserforce.openPage('/lightning/setup/ExternalStrings/home');
      const frame = await global.browserforce.waitForSelectorInFrameOrPage(page, 'input[name="edit"]');
      await frame.locator('input[name="edit"]').click();
      await page.waitForURL((url) => url.pathname === '/lightning/setup/ExternalStrings/page');
    });
  });
  describe('openPage()', () => {
    it('should throw the page error on internal errors', async () => {
      const browserforce = new Browserforce(global.browserforce.connection, global.browserforce.browserContext);
      await assert.rejects(async () => {
        await browserforce.openPage('/_ui/common/config/field/StandardFieldAttributes/d?type=Account&id=INVALID_Name');
      }, /Insufficient Privileges/);
    });
    it('should throw when the page does not exist', async () => {
      const browserforce = new Browserforce(global.browserforce.connection, global.browserforce.browserContext);
      await assert.rejects(async () => {
        await browserforce.openPage('/thispagedoesnotexist');
      }, /404.*thispagedoesnotexist/);
    });
    it('should not throw any error opening a page', async () => {
      const browserforce = new Browserforce(global.browserforce.connection, global.browserforce.browserContext);
      await using _page = await browserforce.openPage(
        '/_ui/common/config/field/StandardFieldAttributes/d?type=Account&id=Name',
      );
    });
  });
});
