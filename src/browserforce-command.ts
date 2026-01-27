import { Flags, SfCommand, Ux } from '@salesforce/sf-plugins-core';
import { promises } from 'fs';
import { type Options } from 'p-retry';
import * as path from 'path';
import { chromium } from 'playwright';
import { Browserforce, type BrowserforceOptions } from './browserforce.js';
import { ConfigParser } from './config-parser.js';
import { handleDeprecations } from './plugins/deprecated.js';
import * as DRIVERS from './plugins/index.js';

export abstract class BrowserforceCommand<T> extends SfCommand<T> {
  static baseFlags = {
    ...SfCommand.baseFlags,
    'target-org': Flags.requiredOrg(),
    definitionfile: Flags.string({
      char: 'f',
      description: 'path to a browserforce config file',
    }),
    'dry-run': Flags.boolean({
      char: 'd',
      description: 'dry run',
      env: 'BROWSERFORCE_DRY_RUN',
    }),
    // browser configuration
    headless: Flags.boolean({
      helpGroup: 'Browser Configuration',
      summary: 'run in headless mode (default: true)',
      allowNo: true,
      env: 'BROWSERFORCE_HEADLESS',
      default: !(process.env.BROWSER_DEBUG === 'true'), // for backwards-compatibility
    }),
    'slow-mo': Flags.integer({
      helpGroup: 'Browser Configuration',
      summary: 'slow motion in milliseconds (default: 0)',
      env: 'BROWSERFORCE_SLOWMO',
      default: Number(process.env.BROWSER_SLOWMO ?? '0'), // for backwards-compatibility
    }),
    timeout: Flags.integer({
      helpGroup: 'Browser Configuration',
      summary: 'the default navigation timeout in milliseconds',
      env: 'BROWSERFORCE_NAVIGATION_TIMEOUT_MS',
      default: 90_000,
    }),
    trace: Flags.boolean({
      helpGroup: 'Browser Configuration',
      summary: 'create a playwright trace',
      description: 'The trace-date.zip file can be viewed with sf browserforce playwright show-trace trace-date.zip.',
      env: 'PLAYWRIGHT_TRACE',
    }),
    exe: Flags.string({
      helpGroup: 'Browser Configuration',
      summary: 'the path to a browser executable',
      description: 'on GitHub Actions with ubuntu-latest, this is set to /usr/bin/google-chrome',
      env: 'PLAYWRIGHT_EXECUTABLE_PATH',
      default: process.env.CHROME_BIN?.length ? process.env.CHROME_BIN : undefined,
    }),
    channel: Flags.string({
      helpGroup: 'Browser Configuration',
      summary: 'the channel (e.g. chromium or chrome) to use',
      description: 'Playwright will try to figure out the path to the browser executable automatically.',
      env: 'PLAYWRIGHT_BROWSER_CHANNEL',
    }),
    // retry config
    'max-retries': Flags.integer({
      helpGroup: 'Retry Configuration',
      summary: 'the maximum number of retries for retryable actions',
      env: 'BROWSERFORCE_RETRY_MAX_RETRIES',
      default: 6,
    }),
    'retry-timeout': Flags.integer({
      helpGroup: 'Retry Configuration',
      summary: 'the inital timeout in milliseconds for retryable actions (exponentially increased)',
      env: 'BROWSERFORCE_RETRY_TIMEOUT_MS',
      default: 4_000,
    }),
  };
  protected browserforce: Browserforce;
  protected settings: any[];
  protected retryConfig?: { retries: number; minTimeout: number };

  public async init(): Promise<void> {
    await super.init();
    const { flags } = await this.parse({
      baseFlags: BrowserforceCommand.baseFlags,
    });
    let definition;
    if (flags.definitionfile) {
      const definitionFileData = await promises.readFile(path.resolve(flags.definitionfile), 'utf8');
      try {
        definition = JSON.parse(definitionFileData);
      } catch (err) {
        throw new Error('Failed parsing config file');
      }
    }
    handleDeprecations(definition);
    this.settings = ConfigParser.parse(DRIVERS, definition);
    const connection = flags['target-org'].getConnection();
    const browserContext = await createBrowserContextFromFlags(flags);
    const options: BrowserforceOptions = {
      logger: new Ux({ jsonEnabled: this.jsonEnabled() }),
      retry: createRetryOptionsFromFlags(flags),
    };
    this.browserforce = new Browserforce(connection, browserContext, options);

    this.spinner.start('logging in');
    await this.browserforce.browserContext.tracing.group('login');
    await this.browserforce.login();
    this.spinner.stop();
    await this.browserforce.browserContext.tracing.groupEnd();
  }

  public async finally(err?: Error): Promise<void> {
    this.spinner.stop(err?.toString());
    if (err?.cause instanceof Error) {
      this.logToStderr(`Cause: ${err.cause.toString()}`);
    }
    if (this.browserforce) {
      this.spinner.start('logging out');
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const tracePath = `trace-${timestamp}.zip`;
        await this.browserforce.browserContext.tracing.stop({ path: tracePath });
        this.logToStderr(`Playwright trace saved to: ${tracePath}`);
      } catch (_) {}
      await this.browserforce.browserContext.browser().close();
      this.spinner.stop();
    }
  }
}

async function createBrowserContextFromFlags(flags) {
  const browser = await chromium.launch({
    ...(flags.channel
      ? {
          channel: flags.channel,
        }
      : {}),
    ...(flags.exe
      ? {
          executablePath: flags.exe,
        }
      : {}),
    headless: flags.headless,
    slowMo: flags['slow-mo'],
  });
  const browserContext = await browser.newContext({
    viewport: { width: 1280, height: 1536 },
  });
  browserContext.setDefaultNavigationTimeout(flags.timeout);
  if (flags.trace) {
    await browserContext.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true,
    });
  }
  return browserContext;
}

function createRetryOptionsFromFlags(flags): Options {
  return {
    retries: flags['max-retries'],
    minTimeout: flags['retry-timeout'],
  };
}
