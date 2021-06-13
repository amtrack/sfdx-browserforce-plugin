import { core, UX } from '@salesforce/command';
import * as assert from 'assert';
import { Browserforce } from '../src/browserforce';

describe('Browser', function() {
  this.slow('30s');
  this.timeout('2m');
  describe('login()', () => {
    it('should successfully login with valid credentials', async () => {
      const defaultScratchOrg = await core.Org.create({});
      const ux = await UX.create();
      const bf = new Browserforce(defaultScratchOrg, ux.cli);
      await bf.login();
      await bf.logout();
      assert(true);
    });

    it('should fail login with invalid credentials', async () => {
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
  describe('getMyDomain()', () => {
    it('should determine a my domain for a scratch org', async () => {
      const defaultScratchOrg = await core.Org.create({});
      const ux = await UX.create();
      const bf = new Browserforce(defaultScratchOrg, ux.cli);
      await bf.login();
      const myDomain = bf.getMyDomain();
      assert.notDeepEqual(null, myDomain);
      await bf.logout();
    });
  });
  describe('getInstanceDomain()', () => {
    it('should determine an instance domain for a scratch org with my domain', async () => {
      const defaultScratchOrg = await core.Org.create({});
      const ux = await UX.create();
      const bf = new Browserforce(defaultScratchOrg, ux.cli);
      await bf.login();
      const instanceDomain = bf.getInstanceDomain();
      assert.notDeepEqual(null, instanceDomain);
      await bf.logout();
    });
  });
  describe('getLightningUrl()', () => {
    it('should determine a LEX URL for a scratch org with my domain', async () => {
      const defaultScratchOrg = await core.Org.create({});
      const ux = await UX.create();
      const bf = new Browserforce(defaultScratchOrg, ux.cli);
      await bf.login();
      const lexUrl = bf.getLightningUrl();
      assert.notDeepEqual(null, lexUrl);
      await bf.logout();
    });
  });
  describe('waitForSelectorInFrameOrPage()', () => {
    it('should query a selector in LEX and Classic UI', async () => {
      const defaultScratchOrg = await core.Org.create({});
      const ux = await UX.create();
      const bf = new Browserforce(defaultScratchOrg, ux.cli);
      await bf.login();
      const page = await bf.openPage('lightning/setup/ExternalStrings/home');
      const frame = await bf.waitForSelectorInFrameOrPage(
        page,
        'input[name="edit"]'
      );
      await Promise.all([
        page.waitForNavigation(),
        frame.click('input[name="edit"]')
      ]);
      await bf.logout();
    });
  });
  describe('throwPageErrors()', () => {
    it('should throw the page error on internal errors', async () => {
      const defaultScratchOrg = await core.Org.create({});
      const ux = await UX.create();
      const bf = new Browserforce(defaultScratchOrg, ux.cli);
      await bf.login();
      process.env.BROWSERFORCE_RETRY_TIMEOUT_MS = '0';
      await assert.rejects(async () => {
        await bf.openPage(
          '_ui/common/config/field/StandardFieldAttributes/d?type=Account&id=INVALID_Name'
        );
      }, /Insufficient Privileges/);
      delete process.env.BROWSERFORCE_RETRY_TIMEOUT_MS;
      await bf.logout();
    });
    it('should not throw any error opening a page', async () => {
      const defaultScratchOrg = await core.Org.create({});
      const ux = await UX.create();
      const bf = new Browserforce(defaultScratchOrg, ux.cli);
      await bf.login();
      await bf.openPage(
        '_ui/common/config/field/StandardFieldAttributes/d?type=Account&id=Name'
      );
      await bf.logout();
    });
  });
});
