import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import {
  DOCS_URL,
  hallOfFameUrl,
  listMarkdownImages,
  rawFileUrl,
  rewriteMarkdownImages,
  settingDocUrl,
  SETTINGS_DOC_URL,
  sourceTreeUrl,
  withRawImageUrls,
} from '../src/docs.js';

const pjson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { homepage: string };
const RAW = 'https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/';

describe('docs', () => {
  it('builds the page URLs from the homepage of package.json', () => {
    assert.strictEqual(DOCS_URL, pjson.homepage);
    assert.ok(DOCS_URL.endsWith('/'));
    assert.strictEqual(SETTINGS_DOC_URL, `${DOCS_URL}settings/`);
    assert.strictEqual(settingDocUrl('densitySettings'), `${DOCS_URL}settings/densitySettings/`);
    assert.strictEqual(hallOfFameUrl('communities'), `${DOCS_URL}hall-of-fame/#communities`);
  });

  it('builds raw file URLs on the main branch of the repository', () => {
    assert.strictEqual(rawFileUrl('docs/assets/a.png'), `${RAW}docs/assets/a.png`);
    assert.strictEqual(rawFileUrl('./docs/assets/a.png'), `${RAW}docs/assets/a.png`);
    assert.strictEqual(
      sourceTreeUrl('src/plugins/slack'),
      'https://github.com/amtrack/sfdx-browserforce-plugin/tree/main/src/plugins/slack',
    );
  });

  describe('rewriteMarkdownImages()', () => {
    it('rewrites relative image targets, with or without a title', () => {
      const markdown = 'Text ![A](docs/a.png) and ![B](docs/b.png "Title")\n![](c.png)';
      assert.strictEqual(
        rewriteMarkdownImages(markdown, (target) => `../${target}`),
        'Text ![A](../docs/a.png) and ![B](../docs/b.png "Title")\n![](../c.png)',
      );
    });

    it('keeps absolute URLs, data URIs, anchors, absolute paths and links', () => {
      const markdown =
        '![a](https://x.io/a.png) ![b](data:image/png;base64,AA) ![c](#top) ![d](/root.png) [link](docs/page.md)';
      assert.strictEqual(
        rewriteMarkdownImages(markdown, () => 'changed'),
        markdown,
      );
    });
  });

  it('lists the relative images of a Markdown text', () => {
    assert.deepStrictEqual(listMarkdownImages('![a](docs/a.png) ![b](https://x.io/b.png) ![c](c.png "t")'), [
      'docs/a.png',
      'c.png',
    ]);
  });

  it('rewrites the images of every description of a JSON Schema to raw URLs without changing the input', () => {
    const schema = {
      description: '![a](docs/a.png)',
      properties: {
        x: { description: 'see ![b](docs/b.png)', examples: ['![c](docs/c.png)'] },
        y: { anyOf: [{ markdownDescription: '![d](docs/d.png)' }] },
      },
    };
    const copy = structuredClone(schema);
    assert.deepStrictEqual(withRawImageUrls(schema), {
      description: `![a](${RAW}docs/a.png)`,
      properties: {
        x: { description: `see ![b](${RAW}docs/b.png)`, examples: ['![c](docs/c.png)'] },
        y: { anyOf: [{ markdownDescription: `![d](${RAW}docs/d.png)` }] },
      },
    });
    assert.deepStrictEqual(schema, copy);
  });
});
