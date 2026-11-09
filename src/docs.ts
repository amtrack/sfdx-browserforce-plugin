import { readFileSync } from 'node:fs';

// `src/docs.ts` and `lib/docs.js` both sit one level below the package root
const pjson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  homepage: string;
};

const GITHUB_REPOSITORY = 'amtrack/sfdx-browserforce-plugin';

/** Path relative to the repository root, without a leading `./` or `/`. */
export const repositoryPath = (path: string): string => path.replace(/^\.?\//, '');

/** Base URL of the documentation site (`homepage` in package.json, which ends with a slash). */
export const DOCS_URL = pjson.homepage;

/** Page listing every setting. */
export const SETTINGS_DOC_URL = `${DOCS_URL}settings/`;

/** Documentation page of a setting, by its key under `settings`. */
export function settingDocUrl(key: string): string {
  return `${SETTINGS_DOC_URL}${key}/`;
}

/** Section of the Hall of Fame page describing a removed setting. */
export function hallOfFameUrl(anchor: string): string {
  return `${DOCS_URL}hall-of-fame/#${anchor}`;
}

/** URL of a file of the repository on the main branch, from its path relative to the repository root. */
export function rawFileUrl(path: string): string {
  return `https://raw.githubusercontent.com/${GITHUB_REPOSITORY}/main/${repositoryPath(path)}`;
}

/** URL of a folder of the repository on GitHub, on the main branch, from its path relative to the repository root. */
export function sourceTreeUrl(path: string): string {
  return `https://github.com/${GITHUB_REPOSITORY}/tree/main/${repositoryPath(path)}`;
}

// ![alt](target) or ![alt](target "title")
const MARKDOWN_IMAGE = /(!\[[^\]]*\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g;

const isRelativePath = (target: string): boolean => !/^([a-z][a-z0-9+.-]*:|#|\/)/i.test(target);

/**
 * Replaces the relative targets of the Markdown images (`![alt](docs/assets/x.png)`) with `map(target)`.
 * Absolute URLs, `data:` URIs, anchors and absolute paths are kept.
 */
export function rewriteMarkdownImages(markdown: string, map: (target: string) => string): string {
  return markdown.replace(MARKDOWN_IMAGE, (image, start: string, target: string, end: string) =>
    isRelativePath(target) ? `${start}${map(target)}${end}` : image,
  );
}

/** Relative paths of the images of a Markdown text (relative to the repository root). */
export function listMarkdownImages(markdown: string): string[] {
  return [...markdown.matchAll(MARKDOWN_IMAGE)].map((match) => match[2]).filter(isRelativePath);
}

const DESCRIPTION_KEYS = new Set(['description', 'markdownDescription']);

/**
 * Copy of a JSON Schema where the images of every description point to their raw URL on GitHub,
 * so they display outside of the documentation site (IDE, sfdx-hardis).
 */
export function withRawImageUrls<T>(schema: T): T {
  if (Array.isArray(schema)) {
    return schema.map((item: unknown) => withRawImageUrls(item)) as T;
  }
  if (typeof schema !== 'object' || schema === null) {
    return schema;
  }
  return Object.fromEntries(
    Object.entries(schema).map(([key, value]) => [
      key,
      DESCRIPTION_KEYS.has(key) && typeof value === 'string'
        ? rewriteMarkdownImages(value, rawFileUrl)
        : withRawImageUrls(value),
    ]),
  ) as T;
}
