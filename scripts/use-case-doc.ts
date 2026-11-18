/**
 * Runtime of the screenshots, taken by the E2E tests tagged `@capture` (`test/capture.ts`): the checks of the scratch
 * org, and the run of one `capture()` test: with CAPTURE=true, it adds the numbered pills next to the controls of each
 * capture (popovers anchored to them, placed by the browser), shoots it and writes the images of the documentation
 * (`src/plugins/<folder>/`).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import type { Org } from '@salesforce/core';
import type { FrameLocator, Locator, Page } from 'playwright';
import { Browserforce, type SalesforceUrlPath } from '../src/browserforce.js';
import { type BrowserforcePlugin } from '../src/plugin.js';
import { drivers, schemas } from '../src/plugins/index.js';
import {
  anchorName,
  type Box,
  computeClip,
  outlineCss,
  pillCss,
  pluginDir,
  VIEWPORT_WIDTH,
  WEBP_QUALITY,
} from './screenshots.js';
import { checkUseCases, fieldsOf, type PageCapture, type UseCase, type UseCaseDoc } from './use-cases.js';

const root = new URL('../', import.meta.url);

/**
 * Refuses what is not a scratch org (the captures change it, irreversibly for some settings) and a user who does not
 * see Setup in English. Returns the identities of its user, never shown in a screenshot.
 */
export async function checkCaptureOrg(org: Org): Promise<string[]> {
  if (!(await org.determineIfScratch())) {
    throw new Error(`${org.getUsername()} is not a scratch org: CAPTURE=true changes the org, use a scratch org`);
  }
  const connection = org.getConnection();
  const username = connection.getUsername()!;
  const user = await connection.singleRecordQuery<{ LanguageLocaleKey: string; Email: string }>(
    `SELECT LanguageLocaleKey, Email FROM User WHERE Username = '${username.replace(/'/g, "\\'")}'`,
  );
  if (user.LanguageLocaleKey !== 'en_US') {
    throw new Error(`The user of ${username} sees Setup in ${user.LanguageLocaleKey}: the screenshots need en_US`);
  }
  // the email of the scratch org user is the one of the Dev Hub user who created it
  return [user.Email, username].filter(Boolean);
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

/**
 * Runs in the frame of a control: makes it a CSS anchor and adds a popover (top layer: no ancestor clips it) anchored
 * to it, in its shadow root if any, since anchor names do not cross into a shadow tree; in the body for the synthetic
 * shadow of Lightning Web Components, whose root does not connect what it gets (its nodes are in the document).
 */
function annotate(control: Element, { anchor, css, text }: { anchor: string; css: string; text: string }): void {
  (control as HTMLElement).style.setProperty('anchor-name', anchor);
  const annotation = control.ownerDocument.createElement('div');
  annotation.setAttribute('data-bf-annotation', '');
  annotation.popover = 'manual';
  annotation.style.cssText = css;
  annotation.textContent = text;
  const root = control.getRootNode();
  if (root instanceof ShadowRoot) {
    root.append(annotation);
  }
  if (!annotation.isConnected) {
    control.ownerDocument.body.append(annotation);
  }
  annotation.showPopover();
}

type Measured = { name: string; buffer: Buffer };

function newPlugin(browserforce: Browserforce, key: string): BrowserforcePlugin {
  const Driver = drivers[key as keyof typeof drivers];
  return new Driver(browserforce);
}

/** What `open()` of a capture gets: opens its page at the size of the screenshot. */
class Doc implements UseCaseDoc {
  public constructor(
    public readonly browserforce: Browserforce,
    private readonly useCase: UseCase,
    private readonly height: number,
  ) {}

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

  public async open(path: `/${string}`): Promise<Page> {
    const page = await this.browserforce.openPage(path as SalesforceUrlPath);
    await page.setViewportSize({ width: VIEWPORT_WIDTH, height: this.height });
    return page;
  }

  public async within(page: Page, selector: string): Promise<Page | FrameLocator> {
    return this.browserforce.waitForSelectorInFrameOrPage(page, selector);
  }

  public async click(page: Page, selector: string): Promise<void> {
    await (await this.within(page, selector)).locator(selector).first().click();
  }
}

/** Adds the pills of a capture to its page, numbered from `first`, and takes its screenshot, cropped around them. */
async function shoot(
  browserforce: Browserforce,
  useCase: UseCase,
  identities: string[],
  { name, page, capture, first }: { name: string; page: Page; capture: PageCapture; first: number },
): Promise<Measured> {
  const pills = Object.entries(capture.pills);
  const ui = await browserforce.waitForSelectorInFrameOrPage(page, capture.context?.[0] ?? pills[0]?.[1] ?? 'body');
  const viewport = page.viewportSize() ?? { width: VIEWPORT_WIDTH, height: 900 };
  const controls: Array<{ n: number; field: string; locator: Locator; box: Box }> = [];
  for (const [index, [field, selector]] of pills.entries()) {
    const n = first + index;
    const locator = ui.locator(selector).first();
    let box: Box | null = null;
    try {
      // eslint-disable-next-line no-await-in-loop
      await locator.waitFor({ state: 'visible', timeout: 30_000 });
      // eslint-disable-next-line no-await-in-loop
      box = await locator.boundingBox();
    } catch (error) {
      throw new Error(
        `${useCase.file}, capture "${name}": pill (${n}) ${field} not found: ${(error as Error).message.split('\n')[0]}`,
      );
    }
    if (!box || box.y + box.height > viewport.height || box.x + box.width > viewport.width) {
      throw new Error(
        `${useCase.file}, capture "${name}": pill (${n}) ${field} is outside the viewport (${JSON.stringify(box)}): ` +
          `give the capture a larger height (now ${viewport.height})`,
      );
    }
    controls.push({ n, field, locator, box });
  }
  const context: Box[] = [];
  for (const selector of capture.context ?? []) {
    let box: Box | null = null;
    try {
      // eslint-disable-next-line no-await-in-loop
      box = await ui.locator(selector).first().boundingBox({ timeout: 30_000 });
    } catch (error) {
      throw new Error(
        `${useCase.file}, capture "${name}": context "${selector}" not found: ${(error as Error).message.split('\n')[0]}`,
      );
    }
    if (box) {
      // the part inside the viewport
      const bottom = Math.min(box.y + box.height, viewport.height);
      const right = Math.min(box.x + box.width, viewport.width);
      context.push({ x: box.x, y: box.y, width: right - box.x, height: bottom - box.y });
    }
  }
  await hideNoise(
    page,
    (capture.hide ?? []).map((selector) => ui.locator(selector)),
    identities,
  );
  // the outlines first, so no outline covers a pill
  for (const { n, locator } of controls) {
    // eslint-disable-next-line no-await-in-loop
    await locator.evaluate(annotate, { anchor: anchorName(n), css: outlineCss(n), text: '' });
  }
  for (const { n, field, locator } of controls) {
    // eslint-disable-next-line no-await-in-loop
    await locator.evaluate(annotate, {
      anchor: anchorName(n),
      css: pillCss(n, capture.positions?.[field]),
      text: `${n}`,
    });
  }
  const annotations = await Promise.all(
    (await ui.locator('[data-bf-annotation]').all()).map((annotation) => annotation.boundingBox()),
  );
  const clip = computeClip(
    [...controls.map((control) => control.box), ...annotations.filter((box): box is Box => box !== null)],
    context,
    viewport,
  );
  const buffer = await page.screenshot({
    type: 'png',
    clip,
    animations: 'disabled',
    caret: 'hide',
  });
  return { name, buffer };
}

/**
 * Shoots the captures of a `capture()` test: those without `open()` in the pages that `retrieve(config)` of the plugin opens,
 * just before it closes them (the first page whose path contains `path`, in the order of `pages`), the others in the
 * page their `open()` returns. Returns the shots in the order of `pages`.
 */
async function shootAll(browserforce: Browserforce, useCase: UseCase, identities: string[]): Promise<Measured[]> {
  const captures = Object.entries(useCase.definition.pages!);
  // pills are numbered in the order of `pages`, whatever the order the pages are opened in
  const firsts = new Map(useCase.captures.map((capture) => [capture.name, capture.pills[0]?.n ?? 0]));
  const shots = new Map<string, Measured>();
  const taken = new Set<string>();
  const fromRetrieve = captures.filter(([, capture]) => !capture.open);
  if (fromRetrieve.length > 0) {
    console.log('      retrieve');
    const openPage = browserforce.openPage;
    // shortcut: patches the instance during retrieve() only, no hook in Browserforce
    browserforce.openPage = async (path: SalesforceUrlPath): Promise<Page> => {
      const page = await openPage.call(browserforce, path);
      const found = fromRetrieve.find(([name, capture]) => !taken.has(name) && path.includes(capture.path ?? ''));
      if (!found) {
        return page;
      }
      const [name, capture] = found;
      taken.add(name);
      await page.setViewportSize({ width: VIEWPORT_WIDTH, height: capture.height ?? 900 });
      const close = page.close.bind(page);
      page.close = async (options): Promise<void> => {
        try {
          shots.set(
            name,
            await shoot(browserforce, useCase, identities, { name, page, capture, first: firsts.get(name)! }),
          );
        } finally {
          await close(options);
        }
      };
      return page;
    };
    try {
      await newPlugin(browserforce, useCase.key).retrieve(structuredClone(useCase.config));
    } finally {
      browserforce.openPage = openPage;
    }
  }
  for (const [name, capture] of captures.filter(([, candidate]) => candidate.open)) {
    console.log(`      open ${name}`);
    // eslint-disable-next-line no-await-in-loop
    await using page = (await capture.open!(new Doc(browserforce, useCase, capture.height ?? 900))) as Page &
      AsyncDisposable;
    // eslint-disable-next-line no-await-in-loop
    shots.set(name, await shoot(browserforce, useCase, identities, { name, page, capture, first: firsts.get(name)! }));
  }
  const missing = captures.filter(([name]) => !shots.has(name)).map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`${useCase.file}: retrieve() opened and closed no page for "${missing.join('", "')}"`);
  }
  return captures.map(([name]) => shots.get(name)!);
}

/** Runs in the browser: encodes a PNG screenshot as WebP, which Playwright does not take. */
async function toWebp({ source, quality }: { source: string; quality: number }): Promise<string> {
  const image = new Image();
  image.src = source;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  canvas.getContext('2d')!.drawImage(image, 0, 0);
  return canvas.toDataURL('image/webp', quality);
}

/** Writes the image of each capture into `src/plugins/<folder>/<capture>.webp`. */
async function writeImages(browserforce: Browserforce, useCase: UseCase, shots: Measured[]): Promise<void> {
  const dir = new URL(`${pluginDir(useCase.folder)}/`, root);
  mkdirSync(dir, { recursive: true });
  await using page = await browserforce.browserContext.newPage();
  for (const shot of shots) {
    // eslint-disable-next-line no-await-in-loop
    const dataUrl = await page.evaluate(toWebp, {
      source: `data:image/png;base64,${shot.buffer.toString('base64')}`,
      quality: WEBP_QUALITY,
    });
    writeFileSync(new URL(`${shot.name}.webp`, dir), Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
  }
}

/**
 * Runs the step of an E2E test tagged `@capture`: apply `config` (or the step passed to `capture()`).
 * With `capture`, it shoots each capture after the step (or before it with `screenshot: 'before'`) and writes its
 * image. Returns what the step returned.
 */
export async function runCapture(
  browserforce: Browserforce,
  useCase: UseCase,
  options: { capture: boolean; identities: string[]; step?: () => Promise<unknown> },
): Promise<unknown> {
  const schema = schemas[useCase.key as keyof typeof schemas];
  const plugin = newPlugin(browserforce, useCase.key);
  const problems = checkUseCases([useCase], fieldsOf(useCase.key), schema, { captured: false });
  if (problems.length > 0) {
    throw new Error(`Invalid capture() test:\n- ${problems.join('\n- ')}`);
  }
  // `browserforce apply` validates the config, then passes it as written, without the zod defaults; each run gets
  // a copy, since a plugin may change the object it gets
  const step = options.step ?? (() => plugin.run(structuredClone(useCase.config)));
  if (!options.capture) {
    return step();
  }
  const before = useCase.definition.screenshot === 'before';
  const shots = before ? await shootAll(browserforce, useCase, options.identities) : undefined;
  const result = await step();
  await writeImages(browserforce, useCase, shots ?? (await shootAll(browserforce, useCase, options.identities)));
  return result;
}
