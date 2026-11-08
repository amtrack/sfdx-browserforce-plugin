import assert from 'node:assert';
import { readdirSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import {
  GENERATED_HEADER,
  plainText,
  removeFrontMatter,
  type LlmsPage,
  readLlmsPage,
  renderCommandExamples,
  renderHomePage,
  renderLlmsTxt,
  renderSettingPage,
  renderSettingsIndex,
  settingPageImage,
  settingPageMeta,
  settingsNav,
  summarize,
  toNavList,
  updateNav,
  withFrontMatter,
} from '../scripts/docs-pages.js';
import { DOCS_URL, rawFileUrl } from '../src/docs.js';
import type { PluginCatalogEntry } from '../src/plugin-catalog.js';
import { deprecatedSettings } from '../src/plugins/deprecated.js';

const entry: PluginCatalogEntry = {
  key: 'densitySettings',
  title: 'My Setting',
  description: 'Does something.\n\n![Screenshot](docs/assets/settings/my-setting.png)',
  docUrl: 'https://example.com/settings/densitySettings/',
  jsonSchema: { type: 'object' },
  groups: [{ path: 'items[]', kind: 'array' }],
  fields: [
    {
      path: 'level',
      type: 'string',
      title: 'Level',
      description: 'The | level',
      required: true,
      enum: ['Low', 'High'],
      default: 'Low',
      isPassword: false,
      isIrreversible: false,
    },
    {
      path: 'items[].secret',
      group: 'items[]',
      type: 'string',
      required: false,
      isPassword: true,
      isIrreversible: true,
    },
  ],
  examples: [{ level: 'Low' }, { level: 'High' }],
  warnings: { irreversibleFields: ['items[].secret'], userInterface: 'classic', prerequisites: ['A license'] },
};

describe('documentation pages', () => {
  describe('settingPageImage()', () => {
    it('keeps the files of docs/ on the site and shows the other files from GitHub', () => {
      assert.strictEqual(settingPageImage('docs/assets/settings/a.png'), '../assets/settings/a.png');
      assert.strictEqual(settingPageImage('./docs/assets/a.png'), '../assets/a.png');
      assert.strictEqual(settingPageImage('examples/a.png'), rawFileUrl('examples/a.png'));
    });
  });

  describe('renderSettingPage()', () => {
    const page = renderSettingPage(entry, { sourceUrl: 'https://github.com/x/tree/main/src/plugins/my-setting' });

    it('starts with its front matter, the generated header and the title', () => {
      assert.ok(
        page.startsWith(
          '---\ntitle: My Setting (settings.densitySettings)\ndescription: Does something.\n---\n\n' +
            `${GENERATED_HEADER}\n\n# My Setting\n\nConfig key: \`settings.densitySettings\``,
        ),
      );
    });

    it('shows the warnings', () => {
      assert.match(page, /!!! warning "Salesforce Classic only"/);
      assert.match(page, /!!! danger "Irreversible"\n {4}Once applied, `items\[\]\.secret` cannot be changed back\./);
      assert.match(page, /!!! info "Prerequisites"\n {4}- A license/);
    });

    it('shows the images of the description from the site', () => {
      assert.ok(page.includes('![Screenshot](../assets/settings/my-setting.png)'));
    });

    it('prefers the description given in the options', () => {
      assert.ok(renderSettingPage(entry, { description: 'Other text' }).includes('\n\nOther text\n\n'));
    });

    it('shows each example as a full config in a tab', () => {
      assert.match(page, /## Examples\n\n=== "Example 1"\n\n {4}```json\n/);
      assert.ok(page.includes('=== "Example 2"'));
      assert.ok(page.includes(`"$schema": "${rawFileUrl('src/plugins/schema.json')}"`));
      assert.ok(page.includes('"densitySettings": {'));
    });

    it('lists the fields in a table', () => {
      assert.ok(page.includes('| Field | Type | Description | Values | Default |'));
      assert.ok(
        page.includes(
          '| <code>level</code> | string | Level<br>The \\| level<br>**Required.** | `Low`<br>`High` | `Low` |',
        ),
      );
      assert.ok(page.includes('| <code>items[].<wbr>secret</code> | string |'));
      assert.ok(page.includes('**Secret:** masked in the output of `apply`.'));
      assert.ok(page.includes('`[]` stands for the items of a list'));
    });

    it('ends with the JSON Schema and the source link', () => {
      assert.match(page, /\?\?\? note "JSON Schema"/);
      assert.ok(
        page.endsWith('[Source code of this setting](https://github.com/x/tree/main/src/plugins/my-setting)\n'),
      );
    });

    it('leaves out the Values and Default columns when no field has any', () => {
      const plain = renderSettingPage({
        ...entry,
        fields: entry.fields.map(({ enum: _enum, default: _default, ...field }) => field),
      });
      assert.ok(plain.includes('| Field | Type | Description |\n| ----- | ---- | ----------- |'));
    });

    it('shows a single example without tabs', () => {
      const single = renderSettingPage({ ...entry, examples: [{ level: 'Low' }] });
      assert.match(single, /## Example\n\n```json\n/);
      assert.ok(!single.includes('=== '));
    });
  });

  it('lists the settings by title and the removed ones with their Hall of Fame section', () => {
    const index = renderSettingsIndex(
      [
        entry,
        {
          ...entry,
          key: 'emailDeliverability',
          title: 'Another',
          warnings: { ...entry.warnings, userInterface: null },
        },
      ],
      deprecatedSettings,
    );
    assert.ok(index.indexOf('[Another](emailDeliverability.md)') < index.indexOf('[My Setting](densitySettings.md)'));
    assert.ok(index.includes('| `densitySettings` | classic only, irreversible, prerequisites |'));
    assert.ok(index.includes('[Hall of Fame](../hall-of-fame.md#defersharingcalculation)'));
  });

  it('builds the navigation by title', () => {
    assert.deepStrictEqual(settingsNav([entry, { ...entry, key: 'emailDeliverability', title: 'Another' }]), [
      { Overview: 'settings/index.md' },
      { Another: 'settings/emailDeliverability.md' },
      { 'My Setting': 'settings/densitySettings.md' },
    ]);
  });

  it('turns nested navigation mappings into lists', () => {
    assert.deepStrictEqual(toNavList({ Reference: 'commands.md', browserforce: { apply: 'browserforce/apply.md' } }), [
      { Reference: 'commands.md' },
      { browserforce: [{ apply: 'browserforce/apply.md' }] },
    ]);
  });

  describe('updateNav()', () => {
    const mkdocsYml = [
      'site_name: Test # the name',
      'nav:',
      '  - Home: index.md',
      '  - Settings: []',
      '  - Commands:',
      '      Reference: commands.md',
      '      browserforce:',
      '        apply: browserforce/apply.md',
      '',
    ].join('\n');

    it('replaces the items of an entry, writes every entry as lists and keeps comments', () => {
      const updated = updateNav(mkdocsYml, 'Settings', [{ Overview: 'settings/index.md' }]);
      assert.ok(updated.includes('# the name'));
      assert.deepStrictEqual(parse(updated).nav, [
        { Home: 'index.md' },
        { Settings: [{ Overview: 'settings/index.md' }] },
        { Commands: [{ Reference: 'commands.md' }, { browserforce: [{ apply: 'browserforce/apply.md' }] }] },
      ]);
    });

    it('fails when the entry is missing', () => {
      assert.throws(() => updateNav(mkdocsYml, 'Missing', []), /no "Missing" entry/);
    });
  });

  it('shows the examples of a command page as sf --help does', () => {
    const page = '# browserforce:plugins:list\n\n```shell\n$ <%= config.bin %> <%= command.id %> --json\n```\n';
    assert.strictEqual(
      renderCommandExamples(page),
      '# browserforce:plugins:list\n\n```shell\n$ sf browserforce plugins list --json\n```\n',
    );
  });

  describe('front matter', () => {
    it('replaces the front matter of a page, quoting values when needed', () => {
      const page = withFrontMatter('---\ntitle: Old\n---\n\n# Page\n', 'New: title', 'A description');
      assert.strictEqual(page, '---\ntitle: "New: title"\ndescription: A description\n---\n\n# Page\n');
      assert.strictEqual(removeFrontMatter(page), '# Page\n');
      assert.strictEqual(withFrontMatter(page, 'New: title', 'A description'), page);
      // Zensical does not escape double quotes in the meta description
      assert.strictEqual(
        withFrontMatter('# Page\n', 'T', 'Choose "No access" or "All"'),
        '---\ntitle: T\ndescription: Choose “No access” or “All”\n---\n\n# Page\n',
      );
    });

    it('turns Markdown into one line of plain text', () => {
      assert.strictEqual(
        plainText('**Bold** and `code`\n\n![img](a.png)\n- a [link](https://x.io) item\n## Heading'),
        'Bold and code a link item Heading',
      );
    });

    it('keeps the first sentences that fit, or cuts at a word', () => {
      assert.strictEqual(summarize('Short.'), 'Short.');
      assert.strictEqual(summarize('First sentence. Second sentence that is too long.', 20), 'First sentence.');
      assert.strictEqual(summarize('one two three four five', 12), 'one two…');
      // a period inside a version or an API name does not end a sentence
      assert.strictEqual(
        summarize('Read-only since API v36.0: no API. Uses AccountSettings.enableX instead of the page for now.', 40),
        'Read-only since API v36.0: no API.',
      );
    });

    it('describes a setting without its Setup menu path', () => {
      const description = [
        'Setup: **Email → Deliverability** (`/lightning/setup/OrgEmailSettings/home`)',
        '',
        'Chooses the access level.',
        '',
        '![Deliverability](docs/assets/settings/email-deliverability.png)',
      ].join('\n');
      assert.deepStrictEqual(settingPageMeta(entry, description), {
        title: 'My Setting (settings.densitySettings)',
        description: 'Chooses the access level.',
      });
      assert.strictEqual(
        settingPageMeta({ ...entry, description: undefined }).description,
        'Apply My Setting in a Salesforce org with Browserforce, using the config key settings.densitySettings.',
      );
    });

    it('reads the front matter and the source file of a page for llms.txt', () => {
      assert.deepStrictEqual(
        readLlmsPage('installation.md', '---\ntitle: Install\ndescription: How\n---\n\n# Install\n'),
        {
          frontMatter: { title: 'Install', description: 'How' },
          sourcePath: 'docs/installation.md',
        },
      );
      // a page that only includes another file points to that file
      assert.deepStrictEqual(readLlmsPage('license.md', '---\ntitle: License\n---\n\n--8<-- "../LICENSE"\n'), {
        frontMatter: { title: 'License' },
        sourcePath: 'LICENSE',
      });
      assert.deepStrictEqual(readLlmsPage('x.md', '# X\n'), { frontMatter: {}, sourcePath: 'docs/x.md' });
    });

    it('lists the pages of the navigation in llms.txt, linking their Markdown sources', () => {
      const pages: Record<string, LlmsPage> = {
        'installation.md': {
          frontMatter: { title: 'Install', description: 'How to install' },
          sourcePath: 'docs/installation.md',
        },
        'settings/index.md': { frontMatter: { title: 'Settings reference' }, sourcePath: 'docs/settings/index.md' },
        'settings/slack.md': {
          frontMatter: { title: 'Slack', description: 'Slack apps' },
          sourcePath: 'docs/settings/slack.md',
        },
        'browserforce/apply.md': {
          frontMatter: { title: 'browserforce:apply' },
          sourcePath: 'docs/browserforce/apply.md',
        },
        'license.md': { frontMatter: { title: 'License' }, sourcePath: 'LICENSE' },
      };
      const nav = [
        { Home: 'index.md' },
        { Installation: 'installation.md' },
        { Settings: [{ Overview: 'settings/index.md' }, { Slack: 'settings/slack.md' }] },
        { Commands: [{ browserforce: [{ apply: 'browserforce/apply.md' }] }] },
        { 'Release notes': 'https://github.com/x/releases' },
        { License: 'license.md' },
      ];
      const llms = renderLlmsTxt(nav, (target) => pages[target], 'https://example.com/docs/');
      assert.ok(
        llms.startsWith('# Browserforce\n\n> Browserforce (sfdx-browserforce-plugin) is a Salesforce CLI plugin'),
      );
      assert.ok(llms.includes('published at `https://example.com/docs/<page>/`'));
      assert.ok(
        llms.includes(`## Get started\n\n- [Install](${rawFileUrl('docs/installation.md')}): How to install\n`),
      );
      assert.ok(llms.includes(`## Settings\n\n- [Settings reference](${rawFileUrl('docs/settings/index.md')})\n`));
      assert.ok(llms.includes(`- [Slack](${rawFileUrl('docs/settings/slack.md')}): Slack apps\n`));
      assert.ok(llms.includes(`- [JSON Schema of config files](${rawFileUrl('src/plugins/schema.json')})`));
      assert.ok(
        llms.includes(
          `## Commands\n\n\n### browserforce\n\n- [browserforce:apply](${rawFileUrl('docs/browserforce/apply.md')})`,
        ),
      );
      assert.ok(
        llms.endsWith(
          `## Optional\n\n- [Release notes](https://github.com/x/releases)\n- [License](${rawFileUrl('LICENSE')})\n`,
        ),
      );
      // the home page repeats the README: not listed
      assert.ok(!llms.includes(rawFileUrl('docs/index.md')));
    });

    it('keeps on the home page only what no other page describes', () => {
      const index = [
        '---\ntitle: T\n---\n',
        '# sfdx-browserforce-plugin\n',
        '📖 **Documentation: [site](https://example.com/)**\n',
        'Why Browserforce.\n',
        '## Example\n\nconfig\n',
        '## Environment variables in config files\n\nvars\n',
        '## Installation\n\nsf plugins install\n\n### Option 1\n\nbrowser\n',
        '## Supported Browserforce Settings\n\ntop settings\n',
        '## Commands\n\n### browserforce:apply\n\ntable\n',
      ].join('\n');
      const home = renderHomePage(index);
      assert.ok(home.startsWith('---\ntitle: T\n---\n\n# sfdx-browserforce-plugin\n\nWhy Browserforce.\n\n## Example'));
      assert.ok(home.includes('## Supported Browserforce Settings\n\ntop settings\n\n## Learn more'));
      for (const removed of ['Documentation:', 'vars', 'sf plugins install', 'Option 1', 'browserforce:apply']) {
        assert.ok(!home.includes(removed), removed);
      }
      assert.ok(home.includes('- [Installation](installation.md)'));
      assert.strictEqual(renderHomePage(home), home);
    });

    it('keeps the front matter of a command page while rendering its examples', () => {
      const page =
        '---\ntitle: "browserforce:apply"\n---\n\n# browserforce:apply\n\n$ <%= config.bin %> <%= command.id %>\n';
      assert.strictEqual(
        renderCommandExamples(page),
        '---\ntitle: "browserforce:apply"\n---\n\n# browserforce:apply\n\n$ sf browserforce apply\n',
      );
    });

    // Generated pages are left out: the generator writes their front matter (tested above), and the docs workflow
    // only warns when the committed ones are not regenerated, so they must not fail the unit tests either.
    it('gives every hand-written page of the documentation site a title and a description', () => {
      const docs = new URL('../docs/', import.meta.url);
      const isGenerated = (page: string): boolean =>
        removeFrontMatter(page).startsWith(GENERATED_HEADER) ||
        removeFrontMatter(page).startsWith(
          "<!-- This file has been generated with command 'sf hardis:doc:plugin:generate'",
        );
      const pages = readdirSync(docs, { recursive: true, encoding: 'utf8' })
        .filter((file) => file.endsWith('.md'))
        .map((file) => ({ file, page: readFileSync(new URL(file.replaceAll('\\', '/'), docs), 'utf8') }))
        .filter(({ page }) => !isGenerated(page));
      assert.ok(pages.length >= 7);
      for (const { file, page } of pages) {
        const frontMatter = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(page)?.[1];
        const meta = (frontMatter ? parse(frontMatter) : {}) as { title?: string; description?: string };
        assert.ok(meta.title, `${file}: title`);
        assert.ok(meta.description, `${file}: description`);
        assert.ok(meta.description.length <= 160, `${file}: description longer than 160 characters`);
      }
    });
  });

  describe('site', () => {
    it('is published at the homepage of package.json', () => {
      const mkdocs = parse(readFileSync(new URL('../mkdocs.yml', import.meta.url), 'utf8')) as { site_url: string };
      assert.strictEqual(mkdocs.site_url, DOCS_URL);
    });

    it('has a Hall of Fame section for each removed setting', () => {
      const hallOfFame = readFileSync(new URL('../docs/hall-of-fame.md', import.meta.url), 'utf8');
      for (const deprecated of deprecatedSettings) {
        const anchor = deprecated.url.split('#')[1];
        assert.ok(hallOfFame.includes(`{ #${anchor} }`), `missing section ${anchor}`);
      }
    });
  });
});
