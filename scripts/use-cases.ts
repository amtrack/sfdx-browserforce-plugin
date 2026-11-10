/**
 * Use cases of the settings: each setting has a `src/plugins/<folder>/use-cases.e2e-spec.ts`, which exports its use
 * cases with `defineUseCases()`: the story told on the page of the setting, the `given` and `config` of the setting,
 * and a `shoot(doc)` function that opens the Setup pages with Playwright and takes the screenshots.
 *
 * - `npm run docs:capture` runs them as E2E tests in a scratch org (`test/docs-setup.ts` makes `defineUseCases()`
 *   register them with mocha): apply `given`, shoot "Before", apply `config`, shoot "After", apply `given` again.
 *   The raw screenshots and the boxes of the controls go to `screenshots/<key>/`.
 * - `npm run docs:annotate` draws the numbered pills on them, `npm run generate:docs` writes the "Use cases" section
 *   of the pages, and the unit tests check them: they import the same files as data, without an org.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { FrameLocator, Locator, Page } from 'playwright';
import { z } from 'zod';
import type { Browserforce } from '../src/browserforce.js';
import type { Field } from '../src/json-schema-utils.js';
import { buildPluginCatalog } from '../src/plugin-catalog.js';
import { schemas } from '../src/plugins/index.js';
import { type Box, readSettingRecord, type SettingRecord } from './screenshots.js';

/** A position of a pill center, in % of the final image, when the default one covers something. */
export type PillPosition = { px?: number; py?: number };

/** How the images of a capture are drawn: changing it only needs `npm run docs:annotate`, not a new capture. */
export type CaptureLayout = {
  /** caption of the image when the use case has several captures */
  title?: string;
  /** part of the viewport kept: around the pills (default), the whole viewport, or a box in CSS pixels */
  clip?: 'auto' | 'viewport' | Box;
  /** manual positions of pills, by field; `before` for the "Before" image only, when the control moves */
  pills?: Record<string, PillPosition & { before?: PillPosition }>;
};

/** The control that shows a field, and the images where it is (both by default). */
export type ShotPill = Locator | { locator: Locator; in: 'before' | 'after' };

export type ShotOptions = {
  /** the control of each field shown in the capture, by concrete path in the config; numbered in this order */
  pills: Record<string, ShotPill>;
  /** controls whose boxes join the pills to frame the image (a form section, a table), for context */
  context?: Locator[];
  /** controls hidden before the shot */
  hide?: Locator[];
};

/** What `shoot()` and `prepare()` get to drive the scratch org. */
export type UseCaseDoc = {
  /** the images being taken: `shoot()` runs once before the config is applied, once after */
  readonly state: 'before' | 'after';
  readonly browserforce: Browserforce;
  readonly orgId: string;
  /** Id of the first record of a SOQL query (Tooling API with `tooling`; 15 characters with `short`) */
  recordId(soql: string, options?: { tooling?: boolean; short?: boolean }): Promise<string>;
  /** opens a page at the width of the screenshots (1440) and the given height (default 900) */
  open(path: `/${string}`, options?: { height?: number }): Promise<Page & AsyncDisposable>;
  /** the page, or the Classic page of a Lightning Setup page (its iframe), once the selector is there */
  within(page: Page, selector: string): Promise<Page | FrameLocator>;
  /** clicks the first control of a selector, in the page or its Classic iframe (a tab, a link; never Save) */
  click(page: Page, selector: string): Promise<void>;
  /** applies the config of another setting, e.g. a feature this use case needs */
  apply<S extends z.ZodType>(schema: S, config: z.input<S>): Promise<void>;
  /** measures the controls and takes the screenshot of a capture */
  shot(name: string, page: Page, options: ShotOptions): Promise<void>;
};

export type UseCaseDefinition<C> = {
  /** `NN-short-title`: the order of the use case on the page, and the prefix of its images */
  slug: string;
  title: string;
  /** the story, in Markdown paragraphs, citing the pills as **(1)** */
  story: string[];
  /** value of the setting applied before the "Before" shots, and again after the "After" shots */
  given?: C;
  /** value of the setting the use case applies */
  config: C;
  /** apply `given` again after the "After" shots, so the next use cases start from a neutral org (default true) */
  restore?: boolean;
  /** why a second run of `config` still changes the org (a replacement in records, a secret that cannot be read) */
  notIdempotent?: string;
  /** fields of `config` that no control of the captured pages shows, with the reason */
  withoutPill?: Record<string, string>;
  /** why the screenshots cannot be produced in a scratch org */
  skip?: string;
  /** how the images of each capture are drawn, by capture name */
  captures?: Record<string, CaptureLayout>;
  /** runs before `given`: the settings or data the use case needs */
  prepare?(doc: UseCaseDoc): Promise<void>;
  /** opens the Setup pages and calls `doc.shot()` for each capture; runs for "Before", then for "After" */
  shoot?(doc: UseCaseDoc): Promise<void>;
};

/** The use cases of a setting, as exported by its `use-cases.e2e-spec.ts`. */
export type UseCaseSet = {
  key: string;
  definitions: Array<UseCaseDefinition<unknown>>;
};

/** A pill with its number and drawing options. */
export type NumberedPill = PillPosition & {
  n: number;
  field: string;
  in: 'both' | 'before' | 'after';
  capture: string;
  before?: PillPosition;
};

export type UseCaseCapture = {
  name: string;
  title?: string;
  clip: 'auto' | 'viewport' | Box;
  pills: NumberedPill[];
};

/** A use case with the captures recorded by its last run (none when it was never captured). */
export type UseCase = {
  /** config key of the setting */
  key: string;
  /** folder of the plugin in src/plugins */
  folder: string;
  slug: string;
  /** where the use case is defined, for the messages */
  file: string;
  title: string;
  story: string;
  given?: unknown;
  config: unknown;
  restore: boolean;
  withoutPill: Array<{ field: string; reason: string }>;
  skip?: string;
  /** the captures of the last run, with the layout of the definition */
  captures: UseCaseCapture[];
  definition: UseCaseDefinition<unknown>;
};

/** What `test/docs-setup.ts` provides to run the use cases; absent outside `npm run docs:capture`. */
export type UseCaseRunner = { run(useCase: UseCase): Promise<void> };

declare global {
  // eslint-disable-next-line no-var
  var browserforceDocs: UseCaseRunner | undefined;
}

export const USE_CASES_FILE = 'use-cases.e2e-spec.ts';
const SLUG = /^\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

/**
 * The use cases of a setting, typed by its schema. Under `npm run docs:capture` (`test/docs-setup.ts` loaded first),
 * it also registers them as mocha tests: `describe('<key>')` with one `it('<slug>')` per use case, the irreversible
 * ones last since their "Before" can only be taken once per org.
 */
export function defineUseCases<S extends z.ZodType>(
  schema: S,
  definitions: Array<UseCaseDefinition<z.input<S>>>,
): UseCaseSet {
  const key = settingKey(schema);
  const set: UseCaseSet = { key, definitions: definitions as Array<UseCaseDefinition<unknown>> };
  const runner = globalThis.browserforceDocs;
  if (runner) {
    const record = readSettingRecord(root, key);
    const useCases = set.definitions.map((definition) => toUseCase(set, definition, record));
    describe(key, function () {
      this.timeout('15m');
      for (const useCase of runOrder(useCases)) {
        (useCase.skip ? it.skip : it)(useCase.slug, async () => runner.run(useCase));
      }
    });
  }
  return set;
}

/**
 * The run order of use cases in one scratch org: by plugin folder, and in each the reversible use cases, then the
 * irreversible ones (their "Before" can only be taken once per org).
 */
export function runOrder(useCases: UseCase[]): UseCase[] {
  const irreversible = (useCase: UseCase): boolean => isIrreversible(useCase, fieldsOf(useCase.key));
  const folders = [...new Set(useCases.map((useCase) => useCase.folder))].sort();
  return folders.flatMap((folder) => {
    const ofFolder = useCases.filter((useCase) => useCase.folder === folder);
    return [...ofFolder.filter((useCase) => !irreversible(useCase)), ...ofFolder.filter(irreversible)];
  });
}

/** A definition with the captures of its record, numbered, and the layout of the definition. */
export function toUseCase(set: UseCaseSet, definition: UseCaseDefinition<unknown>, record?: SettingRecord): UseCase {
  const folder = folderOf(set.key);
  const captures: UseCaseCapture[] = (record?.useCases[definition.slug]?.captures ?? []).map((capture) => {
    const layout = definition.captures?.[capture.name] ?? {};
    return {
      name: capture.name,
      title: layout.title,
      clip: layout.clip ?? 'auto',
      pills: capture.pills.map((pill) => ({
        ...pill,
        capture: capture.name,
        px: layout.pills?.[pill.field]?.px,
        py: layout.pills?.[pill.field]?.py,
        before: layout.pills?.[pill.field]?.before,
      })),
    };
  });
  return {
    key: set.key,
    folder,
    slug: definition.slug,
    file: `src/plugins/${folder}/${USE_CASES_FILE} (${definition.slug})`,
    title: definition.title,
    story: definition.story.join('\n\n'),
    given: definition.given,
    config: definition.config,
    restore: definition.restore ?? true,
    withoutPill: Object.entries(definition.withoutPill ?? {}).map(([field, reason]) => ({ field, reason })),
    skip: definition.skip,
    captures,
    definition,
  };
}

/** The use cases of every setting, by config key, in the order of their definitions, with their records. */
export async function loadUseCases(rootUrl: URL = root): Promise<Map<string, UseCase[]>> {
  const pluginsDir = new URL('src/plugins/', rootUrl);
  const useCases = new Map<string, UseCase[]>();
  for (const [key, folder] of findPluginFolders(pluginsDir)) {
    const file = new URL(`${folder}/${USE_CASES_FILE}`, pluginsDir);
    if (!existsSync(file)) {
      useCases.set(key, []);
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const module = (await import(pathToFileURL(fileURLToPath(file)).href)) as { useCases?: UseCaseSet };
    const set = module.useCases;
    if (set?.key !== key) {
      throw new Error(`src/plugins/${folder}/${USE_CASES_FILE} must export the use cases of ${key} as "useCases"`);
    }
    const record = readSettingRecord(rootUrl, key);
    useCases.set(
      key,
      set.definitions.map((definition) => toUseCase(set, definition, record)),
    );
  }
  return useCases;
}

/** Pills of a use case with their numbers, in the order of the captures. */
export function numberPills(useCase: Pick<UseCase, 'captures'>): NumberedPill[] {
  return useCase.captures.flatMap((capture) => capture.pills);
}

type PathSegment = string | number;

/** `picklistValues[0].newValue` → ['picklistValues', 0, 'newValue']; `[1].name` → [1, 'name'] */
export function parseConcretePath(path: string): PathSegment[] {
  const segments: PathSegment[] = [];
  for (const match of path.matchAll(/\[(\d+)\]|([^.[\]]+)/g)) {
    segments.push(match[1] === undefined ? match[2] : Number(match[1]));
  }
  return segments;
}

/** Value at a concrete path, or undefined. */
export function valueAt(value: unknown, path: string): unknown {
  let current: unknown = value;
  for (const segment of parseConcretePath(path)) {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<PathSegment, unknown>)[segment];
  }
  return current;
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

/** Concrete paths of a value that are instances of a catalog field; `json` fields stop the descent. */
export function fieldInstances(value: unknown, fields: Field[]): string[] {
  const found = new Set<string>();
  const visit = (node: unknown, path: string): void => {
    if (path && fields.some((field) => matchesFieldPath(path, field.path))) {
      found.add(path);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, `${path}[${index}]`));
    } else if (node !== null && typeof node === 'object') {
      for (const [name, item] of Object.entries(node)) {
        visit(item, path ? `${path}.${name}` : name);
      }
    }
  };
  visit(value, '');
  return [...found];
}

/** A bold run of Markdown, `**text**`: the pills are cited inside one. */
export const BOLD_RUN = /\*\*([^*]+)\*\*/g;
/** A pill citation inside a bold run, `(2)`. */
export const PILL_CITATION = /\((\d+)\)/g;

/** Numbers of the pills cited in a story: `**(2)**`, or `(2)` inside a bold run such as `**Save (3)**`. */
export function citedPills(story: string): number[] {
  return [...story.matchAll(BOLD_RUN)].flatMap((bold) =>
    [...bold[1].matchAll(PILL_CITATION)].map((match) => Number(match[1])),
  );
}

type SafeParser = { safeParse: (value: unknown) => { success: boolean; error?: z.core.$ZodError } };

export type CheckOptions = {
  /** check the pills of the captures too (false before the use cases run) */
  captured?: boolean;
  /** check that the use cases together show every field of the setting */
  wholeSetting?: boolean;
};

/**
 * Problems of the use cases of one setting: invalid config, unfinished text, and once captured: unknown fields,
 * fields of the config shown by no pill, pills cited in the story but missing, layouts of unknown captures.
 */
export function checkUseCases(
  useCases: UseCase[],
  fields: Field[],
  schema: SafeParser,
  { captured = true, wholeSetting = true }: CheckOptions = {},
): string[] {
  const problems: string[] = [];
  const covered = new Set<string>();
  const slugs = useCases.map((useCase) => useCase.slug);
  if (new Set(slugs).size !== slugs.length) {
    problems.push(`${useCases[0].key}: two use cases have the same slug`);
  }
  for (const useCase of useCases) {
    const where = useCase.file;
    if (!SLUG.test(useCase.slug)) {
      problems.push(`${where}: the slug must look like 01-short-title`);
    }
    for (const [name, value] of [
      ['config', useCase.config],
      ['given', useCase.given],
    ] as const) {
      if (value === undefined) {
        continue;
      }
      const result = schema.safeParse(value);
      if (!result.success) {
        const details = result.error ? z.prettifyError(result.error) : 'invalid';
        problems.push(`${where}: "${name}" does not match the schema of the setting: ${details}`);
      }
    }
    if (/\bTODO\b/.test(`${useCase.title}\n${useCase.story}`)) {
      problems.push(`${where}: replace the TODO with the story of the use case`);
    }
    if (!useCase.story) {
      problems.push(`${where}: the story is missing`);
    }
    if (!useCase.skip && !useCase.definition.shoot) {
      problems.push(`${where}: no shoot() (add one, or "skip" with the reason)`);
    }
    for (const entry of useCase.withoutPill) {
      covered.add(entry.field);
    }
    if (!captured || useCase.skip) {
      continue;
    }
    if (useCase.captures.length === 0) {
      problems.push(`${where}: never captured: run npm run docs:capture -- -o <scratch org> ${useCase.key}`);
      continue;
    }
    const pills = numberPills(useCase);
    const shown = [...pills.map((pill) => pill.field), ...useCase.withoutPill.map((entry) => entry.field)];
    for (const path of shown) {
      if (!fields.some((field) => matchesFieldPath(path, field.path))) {
        problems.push(`${where}: "${path}" is not a field of the setting`);
      } else if (valueAt(useCase.config, path) === undefined && valueAt(useCase.given, path) === undefined) {
        problems.push(`${where}: "${path}" is set neither in "config" nor in "given"`);
      }
    }
    if (new Set(shown).size !== shown.length) {
      problems.push(`${where}: a field has two pills, or a pill and a "withoutPill" entry`);
    }
    for (const path of fieldInstances(useCase.config, fields)) {
      if (!shown.includes(path)) {
        problems.push(`${where}: "${path}" of the config needs a pill, or a "withoutPill" entry with the reason`);
      }
    }
    for (const n of citedPills(useCase.story)) {
      if (n < 1 || n > pills.length) {
        problems.push(`${where}: the story cites pill (${n}) but the use case has ${pills.length} pills`);
      }
    }
    for (const [name, layout] of Object.entries(useCase.definition.captures ?? {})) {
      const capture = useCase.captures.find((candidate) => candidate.name === name);
      if (!capture) {
        problems.push(`${where}: "captures" names "${name}", which no doc.shot() takes`);
        continue;
      }
      for (const field of Object.keys(layout.pills ?? {})) {
        if (!capture.pills.some((pill) => pill.field === field)) {
          problems.push(`${where}: "captures.${name}.pills" names "${field}", which has no pill in that capture`);
        }
      }
    }
    for (const path of shown) {
      covered.add(path);
    }
  }
  if (wholeSetting && captured && useCases.some((useCase) => !useCase.skip)) {
    for (const field of fields) {
      if (![...covered].some((path) => matchesFieldPath(path, field.path))) {
        problems.push(`${useCases[0].key}: no use case shows the field "${field.path}"`);
      }
    }
  }
  return problems;
}

/** Whether the config of a use case sets a field that cannot be changed back once applied. */
export function isIrreversible(useCase: Pick<UseCase, 'config'>, fields: Field[]): boolean {
  return fieldInstances(useCase.config, fields).some((path) =>
    fields.some((field) => field.isIrreversible && matchesFieldPath(path, field.path)),
  );
}

/**
 * Whether applying the config of a use case changes an irreversible field from its value in `given`: `given` cannot
 * be applied again afterwards. A config that repeats the irreversible value of `given` (`enabled: true` of a portal
 * already enabled) can be restored.
 */
export function changesIrreversibly(useCase: Pick<UseCase, 'config' | 'given'>, fields: Field[]): boolean {
  return fieldInstances(useCase.config, fields).some(
    (path) =>
      fields.some((field) => field.isIrreversible && matchesFieldPath(path, field.path)) &&
      !isDeepStrictEqual(valueAt(useCase.config, path), valueAt(useCase.given, path)),
  );
}

const normalizeText = (text: string): string => text.replace(/\r\n/g, '\n');

/**
 * The code of a plugin without the Markdown descriptions of its schema (`description: [...].join('\n')`), which
 * change nothing in the Setup pages: pointing a description to its new overview image keeps the capture fresh.
 */
export const withoutDescriptions = (code: string): string =>
  code.replace(/description: \[[\s\S]*?\]\.join\('\\n'\)/g, 'description');

function listFiles(dir: URL, relative = ''): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? listFiles(new URL(`${entry.name}/`, dir), `${relative}${entry.name}/`)
        : [`${relative}${entry.name}`],
    )
    .sort();
}

/** The source of a function with its whitespace collapsed, so a reformatting does not make a capture stale. */
const functionCode = (fn?: (...args: never[]) => unknown): string | undefined =>
  fn ? fn.toString().replace(/\s+/g, ' ') : undefined;

/**
 * What of a use case changes its screenshots: the states applied and the code that opens the pages and measures the
 * controls. Its story, title and layout only change the text or the drawing (`npm run docs:annotate`).
 */
function captureSpec(rootUrl: URL, useCase: UseCase): unknown {
  return {
    given: useCase.given,
    config: useCase.config,
    restore: useCase.restore,
    prepare: functionCode(useCase.definition.prepare),
    shoot: functionCode(useCase.definition.shoot),
    helpers: specHelpers(rootUrl, useCase.folder),
  };
}

/**
 * The code of a use cases file before its `defineUseCases()` call: the imports and the helpers that `shoot()` and
 * `prepare()` call (`shootTab()` of salesforceCpqConfig), whose changes change the screenshots too.
 */
function specHelpers(rootUrl: URL, folder: string): string {
  const file = new URL(`src/plugins/${folder}/${USE_CASES_FILE}`, rootUrl);
  if (!existsSync(file)) {
    return '';
  }
  const text = normalizeText(readFileSync(file, 'utf8'));
  const call = text.indexOf('export const useCases = defineUseCases(');
  return (call < 0 ? text : text.slice(0, call)).replace(/\s+/g, ' ');
}

/**
 * Hash of what a capture depends on: its capture spec, and the code (without the descriptions) and fixtures of its
 * plugin. A capture whose hash differs is stale: `npm run docs:capture -- --stale` takes it again. Line endings are
 * normalized, so a checkout with CRLF gives the same hash.
 */
export function captureHash(rootUrl: URL, useCase: UseCase): string {
  const hash = createHash('sha256');
  hash.update(JSON.stringify(captureSpec(rootUrl, useCase)));
  const pluginDir = new URL(`src/plugins/${useCase.folder}/`, rootUrl);
  for (const file of listFiles(pluginDir).filter(
    (name) => name.startsWith('sfdx-source/') || (name.endsWith('.ts') && !/\.(test|e2e-spec)\.ts$/.test(name)),
  )) {
    hash.update(`\0${file}\0`);
    const text = normalizeText(readFileSync(new URL(file, pluginDir), 'utf8'));
    hash.update(file.endsWith('.ts') ? withoutDescriptions(text) : text);
  }
  return hash.digest('hex');
}
