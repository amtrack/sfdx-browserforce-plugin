import assert from 'assert';
import { BrowserforcePlaywrightCommand } from '../../../src/commands/browserforce/playwright.js';

describe(BrowserforcePlaywrightCommand.name, () => {
  it.skip('should print our playwright command help text', async () => {
    const output = await BrowserforcePlaywrightCommand.run(['--help']);
    assert.match(output, /access the Playwright CLI/);
  });
  it('should print the playwright CLIs help text', async () => {
    const output = await BrowserforcePlaywrightCommand.run(['--', '--help']);
    assert.match(output, /ensure browsers necessary for this version of Playwright are installed/);
  }).slow(1_000);
  it('should print the playwright CLIs version', async () => {
    const output = await BrowserforcePlaywrightCommand.run(['--', '--version']);
    assert.match(output, /Version /);
  }).slow(1_000);
}).timeout(5_000);
