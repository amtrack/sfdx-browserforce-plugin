/**
 * Writes the settings reference of the documentation site from the zod schemas of the plugins:
 * docs/settings/<key>.md for each setting, docs/settings/index.md, and the "Settings" navigation in mkdocs.yml.
 * It also completes the command pages that sfdx-hardis wrote before it (examples, navigation written as lists).
 * Run through `npm run generate:docs`, which also generates the command pages with sfdx-hardis.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { listMarkdownImages, repositoryPath, sourceTreeUrl } from '../src/docs.js';
import { buildPluginCatalog } from '../src/plugin-catalog.js';
import { schemas } from '../src/plugins/index.js';
import {
  GENERATED_HEADER,
  PAGE_META,
  removeFrontMatter,
  renderCommandExamples,
  renderHomePage,
  renderSettingPage,
  renderSettingsIndex,
  settingsNav,
  updateNav,
  withFrontMatter,
} from './docs-pages.js';

const root = new URL('../', import.meta.url);
const settingsDir = new URL('docs/settings/', root);
const commandsDir = new URL('docs/browserforce/', root);
const mkdocsYml = new URL('mkdocs.yml', root);
const pluginsDir = new URL('src/plugins/', root);
const pjson = JSON.parse(readFileSync(new URL('package.json', root), 'utf8')) as { version: string };

/** Source folder of each setting, found by the `export const <key>Schema` of its index.ts. */
function findPluginFolders(): Map<string, string> {
  const folders = new Map<string, string>();
  for (const folder of readdirSync(pluginsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    const indexFile = new URL(`${folder.name}/index.ts`, pluginsDir);
    if (existsSync(indexFile)) {
      for (const match of readFileSync(indexFile, 'utf8').matchAll(/export const (\w+)Schema\b/g)) {
        folders.set(match[1], folder.name);
      }
    }
  }
  return folders;
}

const catalog = buildPluginCatalog(pjson.version);
const folders = findPluginFolders();
mkdirSync(settingsDir, { recursive: true });

// the descriptions as written in the schemas, with image paths relative to the repository root
const descriptions = new Map(catalog.plugins.map((entry) => [entry.key, schemas[entry.key].meta()?.description]));
// fail before writing anything, so a missing screenshot does not leave half of the pages regenerated
const missingImages = [...descriptions.values()]
  .flatMap((description) => listMarkdownImages(description ?? ''))
  .filter((image) => !existsSync(new URL(repositoryPath(image), root)));
if (missingImages.length > 0) {
  throw new Error(`Images referenced in the schema descriptions do not exist: ${missingImages.join(', ')}`);
}
for (const entry of catalog.plugins) {
  const folder = folders.get(entry.key);
  const page = renderSettingPage(entry, {
    description: descriptions.get(entry.key),
    sourceUrl: folder ? sourceTreeUrl(`src/plugins/${folder}`) : undefined,
  });
  writeFileSync(new URL(`${entry.key}.md`, settingsDir), page);
}

// remove the generated pages of settings that no longer exist
const keys = new Set<string>(catalog.plugins.map((entry) => entry.key));
for (const file of readdirSync(settingsDir).filter((name) => name.endsWith('.md') && name !== 'index.md')) {
  const fileUrl = new URL(file, settingsDir);
  if (
    !keys.has(file.slice(0, -'.md'.length)) &&
    removeFrontMatter(readFileSync(fileUrl, 'utf8')).startsWith(GENERATED_HEADER)
  ) {
    rmSync(fileUrl);
  }
}

writeFileSync(new URL('index.md', settingsDir), renderSettingsIndex(catalog.plugins, catalog.deprecatedSettings));
writeFileSync(mkdocsYml, updateNav(readFileSync(mkdocsYml, 'utf8'), 'Settings', settingsNav(catalog.plugins)));

// command pages written by sfdx-hardis (with their front matter): show the examples as `sf --help` does
for (const file of readdirSync(commandsDir, { recursive: true, encoding: 'utf8' }).filter((name) =>
  name.endsWith('.md'),
)) {
  // readdirSync returns Windows paths with backslashes
  const fileUrl = new URL(file.replaceAll('\\', '/'), commandsDir);
  writeFileSync(fileUrl, renderCommandExamples(readFileSync(fileUrl, 'utf8')));
}
const homePage = new URL('docs/index.md', root);
writeFileSync(homePage, renderHomePage(readFileSync(homePage, 'utf8')));
for (const [path, meta] of Object.entries(PAGE_META)) {
  const fileUrl = new URL(`docs/${path}`, root);
  writeFileSync(fileUrl, withFrontMatter(readFileSync(fileUrl, 'utf8'), meta.title, meta.description));
}
console.log(`Generated the documentation of ${catalog.plugins.length} settings in docs/settings.`);
