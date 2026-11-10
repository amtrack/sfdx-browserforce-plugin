import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { planImages, staleImages } from '../scripts/annotations.js';
import type { CaptureRecord, SettingRecord } from '../scripts/screenshots.js';
import {
  captureHash,
  changesIrreversibly,
  checkUseCases,
  citedPills,
  defineUseCases,
  fieldInstances,
  isIrreversible,
  loadUseCases,
  matchesFieldPath,
  numberPills,
  parseConcretePath,
  toUseCase,
  type UseCaseDefinition,
  valueAt,
  withoutDescriptions,
} from '../scripts/use-cases.js';
import type { Field } from '../src/json-schema-utils.js';
import { buildPluginCatalog } from '../src/plugin-catalog.js';
import { schemas } from '../src/plugins/index.js';
import { salesforceCpqConfigSchema } from '../src/plugins/salesforce-cpq-config/index.js';

const root = new URL('../', import.meta.url);

const field = (path: string, isIrreversible = false): Field => ({
  path,
  type: 'string',
  required: false,
  isPassword: false,
  isIrreversible,
});

const accept = { safeParse: () => ({ success: true }) };

const set = { key: 'densitySettings', definitions: [] };

const DEFINITION: UseCaseDefinition<unknown> = {
  slug: '01-first',
  title: 'Rename a value',
  given: { values: [{ name: 'Old', active: true }] },
  config: { values: [{ name: 'Old', active: false }] },
  story: ['Deactivate **Old (1)**.'],
  withoutPill: { 'values[0].name': 'the row of the value' },
  captures: { values: { title: 'Values', pills: { 'values[0].active': { px: 10, before: { py: 20 } } } } },
  async shoot() {},
};

const capture = (pills: CaptureRecord['pills'], name = 'values'): CaptureRecord => ({
  name,
  viewport: { width: 1440, height: 900 },
  clip: { x: 0, y: 0, width: 960, height: 420 },
  pills,
  before: { file: 'b.png', pills: [] },
  after: { file: 'a.png', pills: [] },
});

const recordOf = (captures: CaptureRecord[], slug = '01-first'): SettingRecord => ({
  useCases: { [slug]: { hash: 'h', capturedAt: '2026-01-01', captures } },
});

const RECORD = recordOf([capture([{ n: 1, field: 'values[0].active', in: 'both' }])]);

const useCase = (definition: Partial<UseCaseDefinition<unknown>> = {}, record: SettingRecord | null = RECORD) =>
  toUseCase(set, { ...DEFINITION, ...definition }, record ?? undefined);

describe('use cases', () => {
  describe('toUseCase()', () => {
    it('joins the story, defaults restore and lists the fields without pill', () => {
      const parsed = useCase();
      assert.strictEqual(parsed.story, 'Deactivate **Old (1)**.');
      assert.strictEqual(parsed.restore, true);
      assert.deepStrictEqual(parsed.withoutPill, [{ field: 'values[0].name', reason: 'the row of the value' }]);
      assert.strictEqual(parsed.folder, 'density-settings');
      assert.strictEqual(parsed.file, 'src/plugins/density-settings/use-cases.e2e-spec.ts (01-first)');
    });
    it('takes the captures and pills of the record, with the layout of the definition', () => {
      const [values] = useCase().captures;
      assert.deepStrictEqual(values, {
        name: 'values',
        title: 'Values',
        clip: 'auto',
        pills: [
          {
            n: 1,
            field: 'values[0].active',
            in: 'both',
            capture: 'values',
            px: 10,
            py: undefined,
            before: { py: 20 },
          },
        ],
      });
    });
    it('has no captures before the first run', () => {
      assert.deepStrictEqual(useCase({}, null).captures, []);
    });
  });

  describe('withoutDescriptions()', () => {
    it('removes the Markdown descriptions of a plugin, which do not change its pages', () => {
      const code =
        "const a = z.object({}).meta({\n  description: [\n    'Setup: x',\n    '![X](docs/x.webp)',\n  ].join('\\n'),\n});";
      assert.strictEqual(withoutDescriptions(code), 'const a = z.object({}).meta({\n  description,\n});');
      assert.strictEqual(withoutDescriptions("const b = 'description: [x]';"), "const b = 'description: [x]';");
    });
  });

  describe('paths', () => {
    it('parses and reads concrete paths', () => {
      assert.deepStrictEqual(parseConcretePath('picklistValues[0].newValue'), ['picklistValues', 0, 'newValue']);
      assert.deepStrictEqual(parseConcretePath('[1].name'), [1, 'name']);
      assert.strictEqual(valueAt({ a: [{ b: 'x' }] }, 'a[0].b'), 'x');
      assert.strictEqual(valueAt([{ b: 'x' }], '[0].b'), 'x');
      assert.strictEqual(valueAt({ a: 1 }, 'a.b'), undefined);
      assert.strictEqual(valueAt(undefined, 'a'), undefined);
    });
    it('matches concrete paths against the field paths of the catalog', () => {
      assert.ok(matchesFieldPath('picklistValues[0].value', 'picklistValues[].value'));
      assert.ok(matchesFieldPath('[2].objectApiName', '[].objectApiName'));
      assert.ok(matchesFieldPath('Google.consumerKey', '*.consumerKey'));
      assert.ok(!matchesFieldPath('picklistValues.value', 'picklistValues[].value'));
      assert.ok(!matchesFieldPath('a.b.consumerKey', '*.consumerKey'));
      assert.ok(!matchesFieldPath('folderSharingXenable', 'folderSharing.enable'));
    });
    it('lists the field instances of a value, stopping at json fields', () => {
      const fields = [field('items[].name'), field('items[].options')];
      assert.deepStrictEqual(
        fieldInstances({ items: [{ name: 'a', options: { deep: true } }, { name: 'b' }] }, fields),
        ['items[0].name', 'items[0].options', 'items[1].name'],
      );
    });
    it('finds the pills cited in bold runs only', () => {
      assert.deepStrictEqual(citedPills('Click **(1)**, then **Save (3)** and (4).'), [1, 3]);
    });
  });

  describe('checkUseCases()', () => {
    const fields = [field('values[].name'), field('values[].active')];
    it('accepts a complete use case', () => {
      assert.deepStrictEqual(checkUseCases([useCase()], fields, accept), []);
    });
    it('reports invalid configs, unknown or uncovered fields, missing pills and unfinished text', () => {
      const broken = useCase(
        {
          slug: '1-first',
          story: ['TODO **(2)**'],
          withoutPill: { 'values[0].name': 'the row', 'values[0].unknown': 'x' },
          captures: { other: {}, values: { pills: { 'values[0].name': {} } } },
          shoot: undefined,
        },
        recordOf([capture([{ n: 1, field: 'values[0].name', in: 'both' }])], '1-first'),
      );
      const problems = checkUseCases([broken], fields, z.never());
      const expected = [
        /the slug must look like 01-short-title/,
        /"config" does not match/,
        /"given" does not match/,
        /replace the TODO/,
        /no shoot\(\)/,
        /"values\[0\]\.unknown" is not a field/,
        /a field has two pills/,
        /"values\[0\]\.active" of the config needs a pill/,
        /cites pill \(2\) but the use case has 1 pills/,
        /"captures" names "other", which no doc\.shot\(\) takes/,
        /no use case shows the field "values\[\]\.active"/,
      ];
      for (const pattern of expected) {
        assert.ok(
          problems.some((problem) => pattern.test(problem)),
          `${pattern} not in:\n${problems.join('\n')}`,
        );
      }
    });
    it('reports a layout of a pill that its capture does not have', () => {
      const problems = checkUseCases(
        [useCase({ captures: { values: { pills: { 'values[0].name': { px: 1 } } } } })],
        fields,
        accept,
      );
      assert.deepStrictEqual(problems, [
        'src/plugins/density-settings/use-cases.e2e-spec.ts (01-first): "captures.values.pills" names ' +
          '"values[0].name", which has no pill in that capture',
      ]);
    });
    it('requires a capture once the use cases ran, unless the use case is skipped', () => {
      assert.ok(checkUseCases([useCase({}, null)], fields, accept).some((p) => /never captured/.test(p)));
      assert.deepStrictEqual(checkUseCases([useCase({}, null)], fields, accept, { captured: false }), []);
      const skipped = useCase({ skip: 'needs a real app', shoot: undefined }, null);
      assert.deepStrictEqual(checkUseCases([skipped], fields, accept), []);
    });
    it('checks the fields of the whole setting only when asked', () => {
      const partial = useCase({ config: { values: [{ name: 'Old' }] }, withoutPill: {} }, null);
      assert.ok(
        checkUseCases([partial], fields, accept, { captured: false }).every((p) => !/no use case shows/.test(p)),
      );
    });
  });

  describe('numberPills()', () => {
    it('numbers the pills across the captures', () => {
      const parsed = useCase(
        { captures: {} },
        recordOf([
          capture(
            [
              { n: 1, field: 'a', in: 'both' },
              { n: 2, field: 'b', in: 'after' },
            ],
            'one',
          ),
          capture([{ n: 3, field: 'c', in: 'before' }], 'two'),
        ]),
      );
      assert.deepStrictEqual(
        numberPills(parsed).map((pill) => `${pill.n}${pill.field}@${pill.capture}:${pill.in}`),
        ['1a@one:both', '2b@one:after', '3c@two:before'],
      );
    });
    it('detects the configs that set an irreversible field', () => {
      const fields = [field('enabled', true), field('name')];
      assert.ok(isIrreversible({ config: { enabled: true } }, fields));
      assert.ok(!isIrreversible({ config: { name: 'x' } }, fields));
    });
    it('can restore a config that repeats the irreversible values of given', () => {
      const fields = [field('enabled', true), field('name')];
      assert.ok(changesIrreversibly({ given: { enabled: false }, config: { enabled: true } }, fields));
      assert.ok(changesIrreversibly({ config: { enabled: true } }, fields));
      assert.ok(!changesIrreversibly({ given: { enabled: true }, config: { enabled: true, name: 'x' } }, fields));
    });
  });

  describe('captureHash()', () => {
    it('changes with the states applied and the code of shoot(), not with the text or the layout', () => {
      const hash = captureHash(root, useCase());
      assert.strictEqual(captureHash(root, useCase({ story: ['Another story **(1)**.'], title: 'x' })), hash);
      assert.strictEqual(captureHash(root, useCase({ captures: {} })), hash);
      assert.notStrictEqual(captureHash(root, useCase({ config: { values: [] } })), hash);
      assert.notStrictEqual(
        captureHash(root, useCase({ shoot: async (doc) => doc.click(undefined as never, '#x') })),
        hash,
      );
    });
  });

  describe('defineUseCases()', () => {
    const evergreen = { subscriptionsAndRenewals: { enableEvergreenSubscriptions: true } };
    const definitions = [
      { slug: '01-evergreen', title: 'x', given: {}, config: evergreen, story: ['x'] },
      { slug: '02-documents', title: 'y', config: { documents: { postToFeed: true } }, story: ['y'] },
      { slug: '03-later', title: 'z', config: {}, story: ['z'], skip: 'not in a scratch org' },
    ];

    it('takes the key of the setting from its schema and registers no test outside docs:capture', () => {
      assert.strictEqual(globalThis.browserforceDocs, undefined);
      const defined = defineUseCases(salesforceCpqConfigSchema, definitions);
      assert.strictEqual(defined.key, 'salesforceCpqConfig');
      assert.strictEqual(defined.definitions.length, 3);
    });

    it('registers the use cases under docs:capture, the irreversible ones last', () => {
      const registered: string[] = [];
      const globals = globalThis as unknown as Record<string, unknown>;
      const saved = { describe: globals.describe, it: globals.it };
      const register = (title: string): void => {
        registered.push(title);
      };
      globalThis.browserforceDocs = { run: async () => {} };
      globals.describe = (title: string, body: (this: { timeout: () => void }) => void): void => {
        registered.push(`describe ${title}`);
        body.call({ timeout: () => {} });
      };
      globals.it = Object.assign(register, { skip: (title: string) => registered.push(`skip ${title}`) });
      try {
        defineUseCases(salesforceCpqConfigSchema, definitions);
      } finally {
        globalThis.browserforceDocs = undefined;
        Object.assign(globals, saved);
      }
      assert.deepStrictEqual(registered, [
        'describe salesforceCpqConfig',
        '02-documents',
        'skip 03-later',
        '01-evergreen',
      ]);
    });
  });

  describe('use cases of the repository', () => {
    const catalog = buildPluginCatalog('0.0.0');
    let all: Awaited<ReturnType<typeof loadUseCases>>;
    before(async function () {
      // ts-node compiles the use cases of every setting
      this.timeout('2m');
      all = await loadUseCases(root);
    });

    it('every setting has at least one use case', () => {
      const missing = catalog.plugins.filter((entry) => (all.get(entry.key) ?? []).length === 0).map((e) => e.key);
      assert.deepStrictEqual(missing, [], `settings without use case: ${missing.join(', ')}`);
    });
    it('the use cases are valid and show every field of their setting', () => {
      const problems = catalog.plugins.flatMap((entry) =>
        checkUseCases(all.get(entry.key) ?? [], entry.fields, schemas[entry.key]),
      );
      assert.deepStrictEqual(problems, []);
    });
    it('the use cases run only under docs:capture, not with the e2e tests', () => {
      const pjson = JSON.parse(readFileSync(new URL('package.json', root), 'utf8')) as {
        scripts: Record<string, string>;
      };
      assert.match(pjson.scripts['test:e2e'], /--ignore "src\/\*\*\/use-cases\.e2e-spec\.ts"/);
    });
    it('the documentation images match their capture and pills (npm run docs:annotate)', () => {
      const images = catalog.plugins.flatMap((entry) => {
        const useCases = all.get(entry.key) ?? [];
        return useCases.some((candidate) => !candidate.skip) ? planImages(root, entry.key, useCases) : [];
      });
      assert.deepStrictEqual(
        staleImages(root, images).map((planned) => planned.output),
        [],
      );
    });
  });
});
