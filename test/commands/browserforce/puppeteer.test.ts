import assert from 'assert';
import { BrowserforcePuppeteerCommand } from '../../../src/commands/browserforce/puppeteer.js';

describe('BrowserforcePuppeteerCommand', () => {
  it.skip('should print our puppeteer command help text', async () => {
    const output = await BrowserforcePuppeteerCommand.run(['--help']);
    assert.match(output, /access the Puppeteer CLI/);
  });
  it('should print the puppeteer CLIs help text', async () => {
    const output = await BrowserforcePuppeteerCommand.run(['--', '--help']);
    assert.match(output, /Manage browsers of this Puppeteer installation/);
  }).slow(1_000);
});
