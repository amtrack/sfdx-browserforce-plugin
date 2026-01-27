import { Org } from '@salesforce/core';
import { type Options } from 'p-retry';
import { chromium } from 'playwright';
import { Browserforce } from '../src/browserforce.js';

before('global setup', async () => {
  const org = await Org.create({});
  const connection = org.getConnection();
  const browserContext = await createBrowserContextFromEnv();
  await browserContext.tracing.group('global setup');
  const browserforce = new Browserforce(connection, browserContext, { retry: createRetryOptionsFromEnv() });
  global.browserforce = browserforce;
  await browserforce.login();
  await browserContext.tracing.groupEnd();
});

beforeEach('start tracing group', async function () {
  await global.browserforce.browserContext.tracing.group(this.currentTest.fullTitle());
});

afterEach('end tracing group', async function () {
  await global.browserforce.browserContext.tracing.groupEnd();
});

after('global teardown', async () => {
  if (global.browserforce) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const tracePath = `trace-${timestamp}.zip`;
      await global.browserforce.browserContext.tracing.stop({ path: tracePath });
    } catch (_) {}
    await global.browserforce.browserContext.browser().close();
  }
});

async function createBrowserContextFromEnv() {
  const browser = await chromium.launch({
    ...(process.env.PLAYWRIGHT_BROWSER_CHANNEL
      ? {
          channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL,
        }
      : {}),
    ...(process.env.CHROME_BIN
      ? {
          executablePath: process.env.CHROME_BIN,
        }
      : {}),
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? {
          executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
        }
      : {}),
    headless: !(process.env.BROWSER_DEBUG === 'true') || process.env.BROWSERFORCE_HEADLESS === 'false',
    slowMo: Number(process.env.BROWSERFORCE_SLOWMO ?? '0'),
  });
  const browserContext = await browser.newContext({
    viewport: { width: 1280, height: 1536 },
  });
  browserContext.setDefaultNavigationTimeout(Number(process.env.BROWSERFORCE_NAVIGATION_TIMEOUT_MS ?? '90000'));
  if (process.env.PLAYWRIGHT_TRACE === 'true') {
    await browserContext.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true,
    });
  }
  return browserContext;
}

function createRetryOptionsFromEnv(): Options {
  return {
    retries: Number(process.env.BROWSERFORCE_RETRY_MAX_RETRIES ?? '6'),
    minTimeout: Number(process.env.BROWSERFORCE_RETRY_TIMEOUT_MS ?? '4000'),
  };
}
