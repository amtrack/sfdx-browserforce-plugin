/**
 * Draws the numbered pills on the screenshots taken by `npm run docs:capture`, into the WebP images of the
 * documentation (`docs/assets/settings/<key>/`). It needs no org: changing the position of a pill (`captures` in the
 * use case) only needs this step again.
 *
 *   npm run docs:annotate                  # the images whose spec changed
 *   npm run docs:annotate -- picklists     # the images of these settings
 *   npm run docs:annotate -- --force       # every image
 *   npm run docs:annotate -- --check       # fail when an image is missing or stale, without a browser
 *
 * The drawing runs in the bundled headless Chromium: a canvas crops the raw screenshot, draws the outline of each
 * control and its pill, and encodes the result as WebP.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { annotatedFile, planImages, type PlannedImage, staleImages } from './annotations.js';
import { OVERVIEW_FILE, PILL_RADIUS, pillWidth, WEBP_QUALITY } from './screenshots.js';
import { loadUseCases } from './use-cases.js';

const root = new URL('../', import.meta.url);
const args = process.argv.slice(2);
const force = args.includes('--force');
const check = args.includes('--check');
const keys = args.filter((arg) => !arg.startsWith('--'));

type DrawInput = Pick<PlannedImage, 'clip' | 'pills'> & {
  source: string;
  radius: number;
  widths: Record<number, number>;
  quality: number;
};

/** Runs in the browser: returns the annotated image as a WebP data URL. */
async function draw(input: DrawInput): Promise<string> {
  const image = new Image();
  image.src = input.source;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = input.clip.width;
  canvas.height = input.clip.height;
  const context = canvas.getContext('2d')!;
  context.drawImage(
    image,
    input.clip.x,
    input.clip.y,
    input.clip.width,
    input.clip.height,
    0,
    0,
    input.clip.width,
    input.clip.height,
  );
  const roundedRect = (x: number, y: number, width: number, height: number, radius: number): void => {
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
  };
  for (const pill of input.pills) {
    roundedRect(pill.box.x - 3, pill.box.y - 3, pill.box.width + 6, pill.box.height + 6, 4);
    context.lineWidth = 3;
    context.strokeStyle = pill.color;
    context.stroke();
  }
  for (const pill of input.pills) {
    const width = input.widths[pill.n];
    roundedRect(pill.cx - width / 2, pill.cy - input.radius, width, 2 * input.radius, input.radius);
    context.shadowColor = 'rgba(0, 0, 0, 0.35)';
    context.shadowBlur = 4;
    context.shadowOffsetY = 1;
    context.fillStyle = pill.color;
    context.fill();
    context.shadowColor = 'transparent';
    context.lineWidth = 2;
    context.strokeStyle = '#ffffff';
    context.stroke();
    context.fillStyle = '#ffffff';
    context.font = 'bold 15px "Segoe UI", Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(String(pill.n), pill.cx, pill.cy + 1);
  }
  return canvas.toDataURL('image/webp', input.quality);
}

/** Removes the generated images of a setting that no use case produces any more. */
function removeOrphans(key: string, expected: Set<string>): void {
  const dir = new URL(`docs/assets/settings/${key}/`, root);
  if (!existsSync(dir)) {
    return;
  }
  for (const file of readdirSync(dir)) {
    if ((/^\d{2}-.*\.webp$/.test(file) || file === OVERVIEW_FILE) && !expected.has(file)) {
      rmSync(new URL(file, dir));
      console.log(`removed docs/assets/settings/${key}/${file}`);
    }
  }
}

async function main(): Promise<void> {
  const useCases = await loadUseCases(root);
  const unknown = keys.filter((key) => !useCases.has(key));
  if (unknown.length > 0) {
    throw new Error(`Unknown settings: ${unknown.join(', ')}`);
  }
  const selected = keys.length > 0 ? keys : [...useCases.keys()];
  const images = selected.flatMap((key) => {
    const settingUseCases = useCases.get(key)!;
    return settingUseCases.some((useCase) => !useCase.skip) ? planImages(root, key, settingUseCases) : [];
  });
  const todo = force ? images : staleImages(root, images);
  if (check) {
    if (todo.length > 0) {
      throw new Error(
        `Missing or stale images, run npm run docs:annotate:\n- ${todo.map((planned) => planned.output).join('\n- ')}`,
      );
    }
    console.log(`${images.length} images match their spec.`);
    return;
  }
  if (todo.length > 0) {
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      await page.setContent('<!doctype html><html><body></body></html>');
      for (const planned of todo) {
        const source = `data:image/png;base64,${readFileSync(new URL(planned.raw, root)).toString('base64')}`;
        const widths = Object.fromEntries(planned.pills.map((pill) => [pill.n, pillWidth(pill.n)]));
        // eslint-disable-next-line no-await-in-loop
        const dataUrl = await page.evaluate(draw, {
          source,
          clip: planned.clip,
          pills: planned.pills,
          radius: PILL_RADIUS,
          widths,
          quality: WEBP_QUALITY,
        });
        const output = new URL(planned.output, root);
        mkdirSync(new URL('./', output), { recursive: true });
        writeFileSync(output, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
        console.log(`drew ${planned.output}`);
      }
    } finally {
      await browser.close();
    }
  }
  for (const key of selected) {
    const ofKey = images.filter((planned) => planned.key === key);
    removeOrphans(key, new Set(ofKey.map((planned) => planned.output.split('/').pop()!)));
    if (ofKey.length > 0) {
      const stamps = Object.fromEntries(
        ofKey
          .map((planned) => [planned.output.split('/').pop()!, planned.stamp])
          .sort(([a], [b]) => a.localeCompare(b)),
      );
      writeFileSync(new URL(annotatedFile(key), root), `${JSON.stringify(stamps, null, 2)}\n`);
    }
  }
  console.log(`${todo.length} images drawn, ${images.length - todo.length} already up to date.`);
}

await main();
