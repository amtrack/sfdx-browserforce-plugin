/**
 * Mocha setup of the use cases (`npm run docs:capture`, or `npm run test:use-cases` with BROWSERFORCE_DOCS_ORG):
 * loaded with `--file` before the `use-cases.e2e-spec.ts` files, it makes `defineUseCases()` register them as tests,
 * then connects to the scratch org through a Chrome of its own over CDP.
 *
 * Environment: BROWSERFORCE_DOCS_ORG (alias or username of a scratch org, required), BROWSERFORCE_DOCS_HEADED=true
 * to watch the browser, BROWSERFORCE_DOCS_CHROME to use another Chrome.
 */
import { type BrowserContext, chromium } from 'playwright';
import { connectScratchOrg, type Chrome, runUseCase, startChrome, stopChrome } from '../scripts/use-case-doc.js';
import { VIEWPORT_WIDTH } from '../scripts/screenshots.js';
import { Browserforce } from '../src/browserforce.js';

let browserforce: Browserforce | undefined;
let identities: string[] = [];
let chrome: Chrome | undefined;
let context: BrowserContext | undefined;

// set while the files load, so the use cases are registered
globalThis.browserforceDocs = {
  async run(useCase) {
    if (!browserforce) {
      throw new Error('The global setup of the use cases did not connect to the org');
    }
    await runUseCase(browserforce, useCase, identities);
  },
};

before('connect to the scratch org of the use cases', async function () {
  this.timeout('5m');
  const alias = process.env.BROWSERFORCE_DOCS_ORG;
  if (!alias) {
    throw new Error('Set BROWSERFORCE_DOCS_ORG to the scratch org of the use cases (npm run docs:capture -- -o <org>)');
  }
  const connected = await connectScratchOrg(alias);
  identities = connected.identities;
  chrome = await startChrome(process.env.BROWSERFORCE_DOCS_HEADED === 'true');
  const browser = await chromium.connectOverCDP(chrome.endpoint);
  context = await browser.newContext({
    viewport: { width: VIEWPORT_WIDTH, height: 900 },
    deviceScaleFactor: 1,
    locale: 'en-US',
  });
  context.setDefaultNavigationTimeout(90_000);
  browserforce = new Browserforce(connected.org.getConnection(), context, { retry: { retries: 3, minTimeout: 4000 } });
  await browserforce.login();
});

after('stop the Chrome of the use cases', async () => {
  await context?.close().catch(() => undefined);
  if (chrome) {
    await stopChrome(chrome);
  }
});
