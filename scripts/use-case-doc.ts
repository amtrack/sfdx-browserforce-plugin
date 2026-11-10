/**
 * Runtime of the use cases under `npm run docs:capture` (loaded by `test/docs-setup.ts`): the dedicated Chrome over
 * CDP, the checks of the scratch org, and the run of one use case with its `UseCaseDoc`, which opens the Setup pages,
 * measures the controls and writes the raw screenshots and their record to `screenshots/<key>/`.
 */
import assert from 'node:assert';
import { type ChildProcess, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { Org } from '@salesforce/core';
import { chromium, type FrameLocator, type Locator, type Page } from 'playwright';
import type { z } from 'zod';
import { Browserforce, type SalesforceUrlPath } from '../src/browserforce.js';
import { type BrowserforcePlugin } from '../src/plugin.js';
import { drivers, schemas } from '../src/plugins/index.js';
import { deepDiff } from '../src/plugins/utils.js';
import {
  type Box,
  type CaptureRecord,
  computeClip,
  readSettingRecord,
  type RecordedPill,
  type ShotRecord,
  shotFileName,
  VIEWPORT_WIDTH,
  writeSettingRecord,
} from './screenshots.js';
import {
  captureHash,
  changesIrreversibly,
  checkUseCases,
  fieldsOf,
  isIrreversible,
  settingKey,
  type ShotOptions,
  toUseCase,
  type UseCase,
  type UseCaseDoc,
} from './use-cases.js';

const root = new URL('../', import.meta.url);

/** Google Chrome installed on this computer, else the Chromium of Playwright; BROWSERFORCE_DOCS_CHROME overrides it. */
function chromeExecutable(): string {
  if (process.env.BROWSERFORCE_DOCS_CHROME) {
    return process.env.BROWSERFORCE_DOCS_CHROME;
  }
  const candidates =
    process.platform === 'win32'
      ? [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA]
          .filter((dir): dir is string => Boolean(dir))
          .map((dir) => join(dir, 'Google', 'Chrome', 'Application', 'chrome.exe'))
      : process.platform === 'darwin'
        ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
        : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'];
  return candidates.find((candidate) => existsSync(candidate)) ?? chromium.executablePath();
}

export type Chrome = { process: ChildProcess; endpoint: string; profile: string };

/**
 * Starts a Chrome of our own with a free debugging port and an empty profile. It never attaches to, nor closes, a
 * browser it did not start.
 */
export async function startChrome(headed: boolean): Promise<Chrome> {
  const executable = chromeExecutable();
  const profile = mkdtempSync(join(tmpdir(), 'browserforce-docs-'));
  const child = spawn(
    executable,
    [
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--hide-scrollbars',
      // the browser controls (a file input) in English, whatever the language of the computer
      '--lang=en-US',
      ...(headed ? [] : ['--headless=new']),
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  // Chrome writes the port it picked into DevToolsActivePort (the file may exist before the port is written)
  const portFile = join(profile, 'DevToolsActivePort');
  let port = '';
  for (let attempt = 0; attempt < 150 && !port; attempt++) {
    if (child.exitCode !== null) {
      break;
    }
    if (existsSync(portFile)) {
      port = readFileSync(portFile, 'utf8').split('\n')[0].trim();
    }
    if (!port) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(200);
    }
  }
  if (!port) {
    const exitCode = child.exitCode;
    await stopChrome({ process: child, profile, endpoint: '' });
    throw new Error(
      exitCode !== null
        ? `Chrome exited with code ${exitCode}: ${executable}`
        : `Chrome did not open a debugging port: ${executable}`,
    );
  }
  return { process: child, endpoint: `http://127.0.0.1:${port}`, profile };
}

export async function stopChrome(chrome: Chrome): Promise<void> {
  // only the Chrome started above: never browser.close() on a browser this code did not start
  chrome.process.kill();
  // `killed` only says the signal was sent: wait for the exit, so the profile is no longer locked
  for (
    let attempt = 0;
    attempt < 25 && chrome.process.exitCode === null && chrome.process.signalCode === null;
    attempt++
  ) {
    // eslint-disable-next-line no-await-in-loop
    await sleep(200);
  }
  try {
    rmSync(chrome.profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  } catch {
    // a locked file of the profile stays in the temp folder
  }
}

/**
 * Connects to the org, refusing what is not a scratch org (the use cases change it, irreversibly for some settings)
 * and a user who does not see Setup in English. Returns the org and the identities of its user, never shown in a
 * screenshot.
 */
export async function connectScratchOrg(alias: string): Promise<{ org: Org; identities: string[] }> {
  const org = await Org.create({ aliasOrUsername: alias });
  if (!(await org.determineIfScratch())) {
    throw new Error(`${alias} is not a scratch org: the use cases change the org, run them in a scratch org`);
  }
  const connection = org.getConnection();
  const username = connection.getUsername()!;
  const user = await connection.singleRecordQuery<{ LanguageLocaleKey: string; Email: string }>(
    `SELECT LanguageLocaleKey, Email FROM User WHERE Username = '${username.replace(/'/g, "\\'")}'`,
  );
  if (user.LanguageLocaleKey !== 'en_US') {
    throw new Error(`The user of ${alias} sees Setup in ${user.LanguageLocaleKey}: the screenshots need en_US`);
  }
  // the email of the scratch org user is the one of the Dev Hub user who created it
  return { org, identities: [user.Email, username].filter(Boolean) };
}

/** What the email and the username of the org user are replaced with in the screenshots. */
const MASKED_IDENTITY = 'admin@example.com';

/** Runs in the page: replaces the identities in the texts and the field values of the document. */
function maskIdentities({ identities: values, placeholder }: { identities: string[]; placeholder: string }): void {
  if (values.length === 0) {
    return;
  }
  const pattern = new RegExp(values.map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi');
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeValue && pattern.test(node.nodeValue)) {
      node.nodeValue = node.nodeValue.replace(pattern, placeholder);
    }
    pattern.lastIndex = 0;
  }
  for (const field of Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea'),
  )) {
    if (pattern.test(field.value)) {
      field.value = field.value.replace(pattern, placeholder);
    }
    pattern.lastIndex = 0;
  }
}

/** Hides toasts, blinking carets and the controls of `hide`, and masks the identities, in the page and its frames. */
async function hideNoise(page: Page, hide: Locator[], identities: string[]): Promise<void> {
  const css = [
    '.forceToastManager, .toastContainer, .slds-notify_container { visibility: hidden !important; }',
    '* { caret-color: transparent !important; }',
  ].join('\n');
  for (const locator of hide) {
    // eslint-disable-next-line no-await-in-loop
    await locator.evaluateAll((elements) =>
      elements.forEach((element) => (element as HTMLElement).style.setProperty('visibility', 'hidden', 'important')),
    );
  }
  for (const frame of page.frames()) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await frame.addStyleTag({ content: css });
      // eslint-disable-next-line no-await-in-loop
      await frame.evaluate(maskIdentities, { identities, placeholder: MASKED_IDENTITY });
    } catch {
      // a frame of another origin
    }
  }
}

const roundBox = (box: Box): Box => ({
  x: Math.round(box.x),
  y: Math.round(box.y),
  width: Math.round(box.width),
  height: Math.round(box.height),
});

type Shot = ShotRecord & { name: string; pills: ShotRecord['pills']; declared: RecordedPill[]; buffer: Buffer };
type Measured = Shot & { context: Box[]; viewport: { width: number; height: number } };

function newPlugin(browserforce: Browserforce, key: string): BrowserforcePlugin {
  const Driver = drivers[key as keyof typeof drivers];
  return new Driver(browserforce);
}

/** The `doc` of one pass ("Before" or "After") of a use case. */
class Doc implements UseCaseDoc {
  public readonly shots: Measured[] = [];
  private n = 0;

  public constructor(
    public readonly browserforce: Browserforce,
    private readonly useCase: UseCase,
    private readonly identities: string[],
    private readonly currentState?: 'before' | 'after',
  ) {}

  public get state(): 'before' | 'after' {
    if (!this.currentState) {
      throw new Error('doc.state is only known in shoot()');
    }
    return this.currentState;
  }

  public get orgId(): string {
    return this.browserforce.connection.getAuthInfoFields().orgId!;
  }

  public async recordId(soql: string, options: { tooling?: boolean; short?: boolean } = {}): Promise<string> {
    const connection = this.browserforce.connection;
    const result = await (options.tooling ? connection.tooling : connection).query<{ Id: string }>(soql);
    if (result.records.length === 0) {
      throw new Error(`${this.useCase.file}: no record for ${soql}`);
    }
    const id = result.records[0].Id;
    return options.short ? id.slice(0, 15) : id;
  }

  public async open(path: `/${string}`, options: { height?: number } = {}): Promise<Page & AsyncDisposable> {
    const page = (await this.browserforce.openPage(path as SalesforceUrlPath)) as Page & AsyncDisposable;
    await page.setViewportSize({ width: VIEWPORT_WIDTH, height: options.height ?? 900 });
    return page;
  }

  public async within(page: Page, selector: string): Promise<Page | FrameLocator> {
    return this.browserforce.waitForSelectorInFrameOrPage(page, selector);
  }

  public async click(page: Page, selector: string): Promise<void> {
    await (await this.within(page, selector)).locator(selector).first().click();
  }

  public async apply<S extends z.ZodType>(schema: S, config: z.input<S>): Promise<void> {
    await newPlugin(this.browserforce, settingKey(schema)).run(config);
  }

  public async shot(name: string, page: Page, options: ShotOptions): Promise<void> {
    const state = this.state;
    if (this.shots.some((shot) => shot.name === name)) {
      throw new Error(`${this.useCase.file}: two doc.shot() calls take "${name}"`);
    }
    const viewport = page.viewportSize() ?? { width: VIEWPORT_WIDTH, height: 900 };
    const declared: RecordedPill[] = [];
    const pills: ShotRecord['pills'] = [];
    for (const [field, spec] of Object.entries(options.pills)) {
      const n = ++this.n;
      const { locator, in: shownIn } = 'in' in spec ? spec : { locator: spec, in: 'both' as const };
      declared.push({ n, field, in: shownIn });
      if (shownIn !== 'both' && shownIn !== state) {
        continue;
      }
      let box: Box | null = null;
      try {
        // eslint-disable-next-line no-await-in-loop
        await locator.first().waitFor({ state: 'visible', timeout: 30_000 });
        // eslint-disable-next-line no-await-in-loop
        box = await locator.first().boundingBox();
      } catch (error) {
        throw new Error(
          `${this.useCase.file}, capture "${name}" (${state}): pill (${n}) ${field} not found: ${
            (error as Error).message.split('\n')[0]
          }`,
        );
      }
      if (!box || box.y + box.height > viewport.height || box.x + box.width > viewport.width) {
        throw new Error(
          `${this.useCase.file}, capture "${name}" (${state}): pill (${n}) ${field} is outside the viewport ` +
            `(${JSON.stringify(box)}): open the page with a larger height (now ${viewport.height})`,
        );
      }
      pills.push({ n, field, box: roundBox(box) });
    }
    const context: Box[] = [];
    for (const locator of options.context ?? []) {
      // eslint-disable-next-line no-await-in-loop
      const box = await locator.first().boundingBox();
      if (box) {
        // the part inside the viewport
        const bottom = Math.min(box.y + box.height, viewport.height);
        const right = Math.min(box.x + box.width, viewport.width);
        context.push(roundBox({ x: box.x, y: box.y, width: right - box.x, height: bottom - box.y }));
      }
    }
    await hideNoise(page, options.hide ?? [], this.identities);
    const buffer = await page.screenshot({ type: 'png', animations: 'disabled', caret: 'hide' });
    this.shots.push({
      name,
      file: shotFileName(this.useCase.slug, name, state, 'png'),
      pills,
      declared,
      buffer,
      context,
      viewport,
    });
  }
}

/** Runs `shoot()` for one state and returns its shots. */
async function shootState(
  browserforce: Browserforce,
  useCase: UseCase,
  identities: string[],
  state: 'before' | 'after',
): Promise<Measured[]> {
  const doc = new Doc(browserforce, useCase, identities, state);
  console.log(`      shoot (${state})`);
  await useCase.definition.shoot!(doc);
  if (doc.shots.length === 0) {
    throw new Error(`${useCase.file}: shoot() took no doc.shot()`);
  }
  return doc.shots;
}

/**
 * Writes the raw screenshots and the record of a use case once `check` accepts the use case with its new captures,
 * so a use case whose pills do not match is not recorded as captured (`--stale` takes it again).
 */
function record(
  useCase: UseCase,
  hash: string,
  before: Measured[],
  after: Measured[],
  check: (captured: UseCase) => void,
): void {
  const describe = (shots: Measured[]): string =>
    JSON.stringify(shots.map((shot) => ({ name: shot.name, pills: shot.declared })));
  if (describe(before) !== describe(after)) {
    throw new Error(
      `${useCase.file}: shoot() took other captures or pills for "After" than for "Before": ` +
        'declare the same pills in both, with "in" for the controls of one state',
    );
  }
  const captures: CaptureRecord[] = before.map((shotBefore, index) => {
    const shotAfter = after[index];
    const clip = computeClip(
      [...shotBefore.pills, ...shotAfter.pills].map((pill) => pill.box),
      [...shotBefore.context, ...shotAfter.context],
      shotAfter.viewport,
    );
    return {
      name: shotBefore.name,
      viewport: shotAfter.viewport,
      clip,
      pills: shotBefore.declared,
      before: { file: shotBefore.file, pills: shotBefore.pills },
      after: { file: shotAfter.file, pills: shotAfter.pills },
    };
  });
  const settingRecord = readSettingRecord(root, useCase.key) ?? { useCases: {} };
  settingRecord.useCases[useCase.slug] = {
    hash,
    capturedAt: new Date().toISOString().slice(0, 10),
    captures,
  };
  check(toUseCase({ key: useCase.key, definitions: [] }, useCase.definition, settingRecord));
  const dir = new URL(`screenshots/${useCase.key}/`, root);
  mkdirSync(dir, { recursive: true });
  for (const shot of [...before, ...after]) {
    writeFileSync(new URL(shot.file, dir), shot.buffer);
  }
  writeSettingRecord(root, useCase.key, settingRecord);
}

/**
 * Runs a use case as an E2E test: `prepare`, apply `given`, shoot "Before", apply `config` (it must change
 * something), check a second run is "no action necessary" (unless `notIdempotent`), shoot "After", check the pills
 * against the config and the story, record, and apply `given` again (also when it failed).
 */
export async function runUseCase(browserforce: Browserforce, useCase: UseCase, identities: string[]): Promise<void> {
  const schema = schemas[useCase.key as keyof typeof schemas];
  const fields = fieldsOf(useCase.key);
  const plugin = newPlugin(browserforce, useCase.key);
  const problems = checkUseCases([useCase], fields, schema, { captured: false });
  if (problems.length > 0) {
    throw new Error(`Invalid use case:\n- ${problems.join('\n- ')}`);
  }
  // `browserforce apply` validates the config, then passes it as written, without the zod defaults; each run gets
  // a copy, since a plugin may change the object it gets, and the hash is taken before
  const { given, config } = useCase;
  const hash = captureHash(root, useCase);
  const irreversible = isIrreversible(useCase, fields);
  if (irreversible && given !== undefined) {
    const state = await plugin.retrieve(config);
    if (deepDiff(state, config) === undefined) {
      throw new Error(
        `${useCase.file}: the org already has its irreversible config, so the "Before" cannot be shown: ` +
          'capture it in a new scratch org',
      );
    }
  }
  if (useCase.definition.prepare) {
    console.log('      prepare');
    await useCase.definition.prepare(new Doc(browserforce, useCase, identities));
  }
  if (given !== undefined) {
    console.log('      apply "given"');
    await plugin.run(structuredClone(given));
  }
  // a config that repeats the irreversible values of `given` can be undone by `given`
  const restore = useCase.restore && given !== undefined && !changesIrreversibly(useCase, fields);
  let failed = true;
  try {
    const before = await shootState(browserforce, useCase, identities, 'before');
    console.log('      apply "config"');
    const result = await plugin.run(structuredClone(config));
    assert.notDeepStrictEqual(
      result,
      { message: 'no action necessary' },
      `${useCase.file}: "config" changed nothing: the "Before" and "After" would be the same`,
    );
    if (!useCase.definition.notIdempotent) {
      assert.deepStrictEqual(
        await plugin.run(structuredClone(config)),
        { message: 'no action necessary' },
        `${useCase.file}: a second run of "config" still changes the org (or set "notIdempotent" with the reason)`,
      );
    }
    const after = await shootState(browserforce, useCase, identities, 'after');
    record(useCase, hash, before, after, (captured) => {
      const pillProblems = checkUseCases([captured], fields, schema, { wholeSetting: false });
      if (pillProblems.length > 0) {
        throw new Error(`The pills do not match the config or the story:\n- ${pillProblems.join('\n- ')}`);
      }
    });
    failed = false;
  } finally {
    // the next use cases start from a neutral org, even when this one failed after applying its config
    if (restore) {
      console.log('      restore "given"');
      const restoring = plugin.run(structuredClone(given));
      // after a failure, the error of the use case is the one to report
      await (failed
        ? restoring.catch((error: Error) => console.error(`      restore failed: ${error.message}`))
        : restoring);
    }
  }
}
