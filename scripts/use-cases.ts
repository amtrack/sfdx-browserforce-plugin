/**
 * The screenshots of the settings: an E2E test tagged `@capture` in its title wraps its step with `capture()`
 * (`test/capture.ts`), whose definition lists the captures of the setting (`pages`): the selector of the control of
 * each field, in the page that `retrieve()` of the plugin opens or the one `open()` returns.
 *
 * - `CAPTURE=true npm run test:e2e` takes the screenshots in a scratch org while the E2E tests run and draws the
 *   numbered pills into `src/plugins/<folder>/<capture>.webp`.
 * - `npm run generate:docs` shows them on the page of the setting, and the unit tests check them: `loadUseCases()` reads
 *   the E2E test files without running them. The stories of a setting are hand-written in
 *   `src/plugins/<folder>/use-cases.md`.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { FrameLocator, Page } from 'playwright';
import { z } from 'zod';
import type { Browserforce } from '../src/browserforce.js';
import type { Field } from '../src/json-schema-utils.js';
import { buildPluginCatalog } from '../src/plugin-catalog.js';
import { schemas } from '../src/plugins/index.js';
import { type Box, pluginDir } from './screenshots.js';

/** A position of a pill center, in % of the final image, when the default one covers something. */
export type PillPosition = { px?: number; py?: number };

/**
 * A capture: one annotated screenshot of a page, by default the one `retrieve(config)` of the plugin opens, shot just
 * before it closes it. The selectors are looked up in the page or its Classic iframe.
 */
export type PageCapture = {
  /**
   * opens the page to shoot instead, when `retrieve()` opens none to show (it reads the API, or the page to show is a
   * record or needs a click); use the paths the plugin exports
   */
  open?(doc: UseCaseDoc): Promise<Page>;
  /** a part of the path of the page, when `retrieve()` opens other pages before it */
  path?: string;
  /** height of the viewport (default 900) */
  height?: number;
  /** the control of each field shown in the capture, by concrete path in the config; numbered in this order */
  pills: Record<string, string>;
  /** controls whose boxes join the pills to frame the image (a form section, a table), for context */
  context?: string[];
  /** controls hidden before the shot */
  hide?: string[];
  /** caption of the image when the setting has several captures */
  title?: string;
  /** part of the viewport kept: around the pills (default), the whole viewport, or a box in CSS pixels */
  clip?: 'auto' | 'viewport' | Box;
  /** manual positions of pills, by field, when the default one covers something */
  positions?: Record<string, PillPosition>;
};

/** What `open()` of a capture gets to drive the scratch org. */
export type UseCaseDoc = {
  readonly browserforce: Browserforce;
  readonly orgId: string;
  /** Id of the first record of a SOQL query (Tooling API with `tooling`; 15 characters with `short`) */
  recordId(soql: string, options?: { tooling?: boolean; short?: boolean }): Promise<string>;
  /** opens a page at the size of the screenshot (1440 wide, the `height` of the capture) */
  open(path: `/${string}`): Promise<Page>;
  /** the page, or the Classic page of a Lightning Setup page (its iframe), once the selector is there */
  within(page: Page, selector: string): Promise<Page | FrameLocator>;
  /** clicks the first control of a selector, in the page or its Classic iframe (a tab, a link; never Save) */
  click(page: Page, selector: string): Promise<void>;
};

export type UseCaseDefinition<C> = {
  /** value of the setting the step applies (unless the test passes its own step to `capture()`) */
  config: C;
  /**
   * when the screenshots are taken: after the step (default), or before it, when the config removes what they show
   * (a deleted value, a renamed one)
   */
  screenshot?: 'before' | 'after';
  /** the captures, by name (the file name of the image): one screenshot each, its pills numbered in this order */
  pages: Record<string, PageCapture>;
};

/** What `capture()` attaches to the test function it returns, so it can be read without running it. */
export type CaptureTestData = { key: string; definition: UseCaseDefinition<unknown> };

/** A pill with its number and drawing options. */
export type NumberedPill = PillPosition & {
  n: number;
  field: string;
  capture: string;
};

export type UseCaseCapture = {
  name: string;
  title?: string;
  clip: 'auto' | 'viewport' | Box;
  pills: NumberedPill[];
};

/** The screenshots of a `capture()` test, with their numbered pills. */
export type UseCase = {
  /** config key of the setting */
  key: string;
  /** folder of the plugin in src/plugins */
  folder: string;
  /** where it is defined (the E2E test), for the messages */
  file: string;
  config: unknown;
  captures: UseCaseCapture[];
  definition: UseCaseDefinition<unknown>;
};

/** The tag of the title of the E2E tests that take screenshots: `it('... @capture', capture(...))`. */
export const CAPTURE_TAG = '@capture';
/** Where the E2E tests are, in a plugin folder (`index.e2e-spec.ts`, also in the folders of its parts). */
const E2E_FILE = /\.e2e-spec\.ts$/;

const root = new URL('../', import.meta.url);

/** Source folder of each setting, found by the `export const <key>Schema` of its index.ts. */
export function findPluginFolders(pluginsDir: URL): Map<string, string> {
  const folders = new Map<string, string>();
  for (const folder of readdirSync(pluginsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    const indexFile = new URL(`${folder.name}/index.ts`, pluginsDir);
    if (existsSync(indexFile)) {
      for (const match of readFileSync(indexFile, 'utf8').matchAll(/export const (\w+)Schema\b/g)) {
        // an index.ts may export the schemas of its parts too (portalSchema in customer-portal)
        if (match[1] in schemas) {
          folders.set(match[1], folder.name);
        }
      }
    }
  }
  return folders;
}

/** Config key of the schema of a setting, as registered in src/plugins/index.ts. */
export function settingKey(schema: z.ZodType): string {
  const key = Object.entries(schemas).find(([, candidate]) => candidate === schema)?.[0];
  if (!key) {
    throw new Error('Pass the schema of a setting, as exported by its plugin and registered in src/plugins/index.ts');
  }
  return key;
}

let foldersCache: Map<string, string> | undefined;
function folderOf(key: string): string {
  foldersCache ??= findPluginFolders(new URL('src/plugins/', root));
  const folder = foldersCache.get(key);
  if (!folder) {
    throw new Error(`No plugin folder for the setting ${key}`);
  }
  return folder;
}

let fieldsCache: Map<string, Field[]> | undefined;
/** The fields of a setting in the catalog. */
export function fieldsOf(key: string): Field[] {
  fieldsCache ??= new Map(buildPluginCatalog('0.0.0').plugins.map((entry) => [entry.key as string, entry.fields]));
  return fieldsCache.get(key) ?? [];
}

/** A definition with its captures, their pills numbered in the order of `pages`. */
export function toUseCase(
  key: string,
  definition: UseCaseDefinition<unknown>,
  file = `src/plugins/${folderOf(key)}`,
): UseCase {
  let n = 0;
  const captures: UseCaseCapture[] = Object.entries(definition.pages).map(([name, page]) => ({
    name,
    title: page.title,
    clip: page.clip ?? 'auto',
    pills: Object.keys(page.pills).map((field) => ({
      n: ++n,
      field,
      capture: name,
      px: page.positions?.[field]?.px,
      py: page.positions?.[field]?.py,
    })),
  }));
  return { key, folder: folderOf(key), file, config: definition.config, captures, definition };
}

function listE2eFiles(dir: URL): URL[] {
  return readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) =>
      entry.isDirectory()
        ? listE2eFiles(new URL(`${entry.name}/`, dir))
        : E2E_FILE.test(entry.name)
          ? [new URL(entry.name, dir)]
          : [],
    );
}

type CollectedTest = { title: string; data: CaptureTestData };
const collectedTests = new Map<string, CollectedTest[]>();

/**
 * The `capture()` tests of an E2E test file, read by importing it with stand-ins for the globals of mocha that run the
 * `describe()` bodies but no test or hook. A module is only evaluated once, so the result is kept.
 */
async function collectCaptureTests(file: URL): Promise<CollectedTest[]> {
  const cached = collectedTests.get(file.href);
  if (cached) {
    return cached;
  }
  const tests: CollectedTest[] = [];
  const noop = (): void => {};
  const suiteContext = { timeout: noop, slow: noop, retries: noop };
  const suite = (_title: string, body?: (this: typeof suiteContext) => void): void => body?.call(suiteContext);
  const test = (title: string, fn?: { useCase?: CaptureTestData }): void => {
    if (fn?.useCase) {
      tests.push({ title, data: fn.useCase });
    }
  };
  const stand = {
    describe: Object.assign(suite, { skip: suite, only: suite }),
    it: Object.assign(test, { skip: test, only: test }),
    before: noop,
    after: noop,
    beforeEach: noop,
    afterEach: noop,
  };
  const globals = globalThis as unknown as Record<string, unknown>;
  const saved = Object.fromEntries(Object.keys(stand).map((name) => [name, globals[name]]));
  Object.assign(globals, stand);
  try {
    await import(pathToFileURL(fileURLToPath(file)).href);
  } finally {
    Object.assign(globals, saved);
  }
  collectedTests.set(file.href, tests);
  return tests;
}

/**
 * The `capture()` tests of every setting, by config key, in the order of their files. A test belongs to the setting of
 * the schema given to `capture()`, whatever the folder of its test: the first test that turns on a setting another one
 * needs may be in the folder of the other one (einsteinConversationInsights in call-summaries).
 */
export async function loadUseCases(rootUrl: URL = root): Promise<Map<string, UseCase[]>> {
  const pluginsDir = new URL('src/plugins/', rootUrl);
  const folders = findPluginFolders(pluginsDir);
  const useCases = new Map<string, UseCase[]>([...folders.keys()].map((key) => [key, []]));
  for (const file of listE2eFiles(pluginsDir)) {
    // eslint-disable-next-line no-await-in-loop
    for (const { title, data } of await collectCaptureTests(file)) {
      const where = `${fileURLToPath(file).slice(fileURLToPath(rootUrl).length)} "${title}"`;
      if (!title.includes(CAPTURE_TAG)) {
        throw new Error(`${where}: the title of a capture() test must include ${CAPTURE_TAG}`);
      }
      useCases.get(data.key)!.push(toUseCase(data.key, data.definition, where));
    }
  }
  return useCases;
}

/** Pills of a `capture()` test with their numbers, in the order of the captures. */
export function numberPills(useCase: Pick<UseCase, 'captures'>): NumberedPill[] {
  return useCase.captures.flatMap((capture) => capture.pills);
}

/**
 * Whether a concrete path (`picklistValues[0].value`, `Account.consumerKey`) is an instance of a catalog field path
 * (`picklistValues[].value`, `*.consumerKey`): `[]` stands for an index, `*` for the name of an entry.
 */
export function matchesFieldPath(concrete: string, fieldPath: string): boolean {
  const pattern = fieldPath
    .split(/(\[\]|\*)/)
    .map((part) => {
      if (part === '[]') {
        return '\\[\\d+\\]';
      }
      if (part === '*') {
        return '[^.[\\]]+';
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('');
  return new RegExp(`^${pattern}$`).test(concrete);
}

type SafeParser = { safeParse: (value: unknown) => { success: boolean; error?: z.core.$ZodError } };

export type CheckOptions = {
  /** check that the images of the captures exist (false before the screenshots are taken) */
  captured?: boolean;
};

/**
 * Problems of the `capture()` tests of one setting: invalid config, no capture, two captures of the same name (the
 * same image), pills on fields the setting does not have, positions of pills the capture does not have, and missing
 * images.
 */
export function checkUseCases(
  useCases: UseCase[],
  fields: Field[],
  schema: SafeParser,
  { captured = true }: CheckOptions = {},
): string[] {
  const problems: string[] = [];
  const names = useCases.flatMap((useCase) => useCase.captures.map((capture) => capture.name));
  for (const name of new Set(names.filter((name, index) => names.indexOf(name) !== index))) {
    problems.push(`${useCases[0].key}: two captures are named "${name}", their images would overwrite each other`);
  }
  for (const useCase of useCases) {
    const where = useCase.file;
    const result = schema.safeParse(useCase.config);
    if (!result.success) {
      const details = result.error ? z.prettifyError(result.error) : 'invalid';
      problems.push(`${where}: "config" does not match the schema of the setting: ${details}`);
    }
    if (useCase.captures.length === 0) {
      problems.push(`${where}: no capture in "pages"`);
    }
    for (const capture of useCase.captures) {
      const image = `${pluginDir(useCase.folder)}/${capture.name}.webp`;
      if (captured && !existsSync(new URL(image, root))) {
        problems.push(`${where}: ${image} is missing: run CAPTURE=true npm run test:e2e in a scratch org`);
      }
      for (const pill of capture.pills) {
        if (!fields.some((field) => matchesFieldPath(pill.field, field.path))) {
          problems.push(`${where}: "${pill.field}" is not a field of the setting`);
        }
      }
      for (const field of Object.keys(useCase.definition.pages[capture.name].positions ?? {})) {
        if (!capture.pills.some((pill) => pill.field === field)) {
          problems.push(`${where}: "pages.${capture.name}.positions" names "${field}", which has no pill`);
        }
      }
    }
  }
  return problems;
}
