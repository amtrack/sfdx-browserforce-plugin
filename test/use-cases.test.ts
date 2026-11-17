import assert from 'node:assert';
import { z } from 'zod';
import {
  checkUseCases,
  loadUseCases,
  matchesFieldPath,
  numberPills,
  toUseCase,
  type UseCaseDefinition,
} from '../scripts/use-cases.js';
import type { Field } from '../src/json-schema-utils.js';
import { buildPluginCatalog } from '../src/plugin-catalog.js';
import { schemas } from '../src/plugins/index.js';
import { salesforceCpqConfigSchema } from '../src/plugins/salesforce-cpq-config/index.js';
import { capture as captureTest } from './capture.js';

const root = new URL('../', import.meta.url);

const field = (path: string): Field => ({
  path,
  type: 'string',
  required: false,
  isPassword: false,
  isIrreversible: false,
});

const accept = { safeParse: () => ({ success: true }) };

const KEY = 'densitySettings';

const DEFINITION: UseCaseDefinition<unknown> = {
  config: { values: [{ name: 'Old', active: false }] },
  pages: {
    values: {
      title: 'Values',
      pills: { 'values[0].active': 'input' },
      positions: { 'values[0].active': { px: 10 } },
    },
  },
};

const useCase = (definition: Partial<UseCaseDefinition<unknown>> = {}) =>
  toUseCase(KEY, { ...DEFINITION, ...definition });

// the images of the captures of these tests do not exist
const notCaptured = { captured: false };

// settings whose screenshot a scratch org cannot show
const WITHOUT_SCREENSHOT = new Set([
  // enhanced folder sharing is always on in orgs created after Summer '13
  'reportsAndDashboards',
]);

describe('use cases', () => {
  describe('toUseCase()', () => {
    it('numbers the pills of the pages, with their positions', () => {
      const parsed = useCase();
      assert.strictEqual(parsed.folder, 'density-settings');
      assert.strictEqual(parsed.file, 'src/plugins/density-settings');
      assert.deepStrictEqual(parsed.captures, [
        {
          name: 'values',
          title: 'Values',
          clip: 'auto',
          pills: [{ n: 1, field: 'values[0].active', capture: 'values', px: 10, py: undefined }],
        },
      ]);
    });
  });

  it('matches concrete paths against the field paths of the catalog', () => {
    assert.ok(matchesFieldPath('picklistValues[0].value', 'picklistValues[].value'));
    assert.ok(matchesFieldPath('[2].objectApiName', '[].objectApiName'));
    assert.ok(matchesFieldPath('Google.consumerKey', '*.consumerKey'));
    assert.ok(!matchesFieldPath('picklistValues.value', 'picklistValues[].value'));
    assert.ok(!matchesFieldPath('a.b.consumerKey', '*.consumerKey'));
    assert.ok(!matchesFieldPath('folderSharingXenable', 'folderSharing.enable'));
  });

  describe('checkUseCases()', () => {
    const fields = [field('values[].name'), field('values[].active')];
    it('accepts a complete capture() test', () => {
      assert.deepStrictEqual(checkUseCases([useCase()], fields, accept, notCaptured), []);
    });
    it('reports invalid configs, unknown fields, unknown positions, empty or duplicate captures', () => {
      const broken = useCase({
        pages: {
          values: {
            pills: { 'values[0].unknown': 'input' },
            positions: { 'values[0].name': { px: 1 } },
          },
        },
      });
      const problems = checkUseCases([broken, useCase(), useCase({ pages: {} })], fields, z.never(), notCaptured);
      const expected = [
        /two captures are named "values"/,
        /"config" does not match/,
        /"values\[0\]\.unknown" is not a field/,
        /"pages\.values\.positions" names "values\[0\]\.name", which has no pill/,
        /no capture in "pages"/,
      ];
      for (const pattern of expected) {
        assert.ok(
          problems.some((problem) => pattern.test(problem)),
          `${pattern} not in:\n${problems.join('\n')}`,
        );
      }
    });
    it('requires the images once the screenshots were taken', () => {
      assert.ok(
        checkUseCases([useCase()], fields, accept).some((p) => /density-settings\/values\.webp is missing/.test(p)),
      );
    });
  });

  it('numberPills() numbers the pills across the captures', () => {
    const parsed = useCase({
      pages: { one: { pills: { a: 'x', b: 'y' } }, two: { pills: { c: 'z' } } },
    });
    assert.deepStrictEqual(
      numberPills(parsed).map((pill) => `${pill.n}${pill.field}@${pill.capture}`),
      ['1a@one', '2b@one', '3c@two'],
    );
  });

  describe('capture()', () => {
    const definition = { config: { documents: { postToFeed: true } }, pages: {} };
    it('attaches its definition to the test function, keyed by the setting of the schema', () => {
      const test = captureTest(salesforceCpqConfigSchema, definition);
      assert.strictEqual(typeof test, 'function');
      assert.deepStrictEqual(test.useCase, { key: 'salesforceCpqConfig', definition });
    });
    it('refuses a test whose title is not tagged @capture', async () => {
      const test = captureTest(salesforceCpqConfigSchema, definition);
      await assert.rejects(
        () => test.call({ test: { title: 'should enable' } } as unknown as Mocha.Context, () => {}),
        /must include @capture/,
      );
    });
  });

  describe('screenshots of the repository', () => {
    const catalog = buildPluginCatalog('0.0.0');
    let all: Awaited<ReturnType<typeof loadUseCases>>;
    before(async function () {
      // ts-node compiles the E2E tests of every setting
      this.timeout('2m');
      all = await loadUseCases(root);
    });

    it('every setting has a screenshot', () => {
      const missing = catalog.plugins
        .filter((entry) => !WITHOUT_SCREENSHOT.has(entry.key) && (all.get(entry.key) ?? []).length === 0)
        .map((entry) => entry.key);
      assert.deepStrictEqual(missing, [], `settings without screenshot: ${missing.join(', ')}`);
    });
    it('the capture() tests are valid and their images exist', () => {
      const problems = catalog.plugins.flatMap((entry) =>
        checkUseCases(all.get(entry.key) ?? [], entry.fields, schemas[entry.key]),
      );
      assert.deepStrictEqual(problems, []);
    });
  });
});
