/**
 * The documentation images expected from the capture records: for each use case that is not skipped, a "Before" and
 * an "After" image per capture with their pills, plus the overview image of the setting (first use case, first
 * capture, "After", without pills). Shared by `npm run docs:annotate`, which draws them, and by the unit test that
 * checks the committed images match their spec.
 */
import { existsSync, readFileSync } from 'node:fs';
import {
  annotationStamp,
  type DrawnPill,
  type Box,
  OVERVIEW_FILE,
  placePill,
  readSettingRecord,
  shotFileName,
  toClip,
} from './screenshots.js';
import type { UseCase } from './use-cases.js';

export type PlannedImage = {
  key: string;
  /** path of the documentation image, relative to the repository root */
  output: string;
  /** path of the raw screenshot, relative to the repository root */
  raw: string;
  clip: Box;
  pills: DrawnPill[];
  stamp: string;
};

/** `screenshots/<key>/annotated.json`: the stamp of each documentation image of the setting, by file name. */
export const annotatedFile = (key: string): string => `screenshots/${key}/annotated.json`;

/** Images of a setting. Throws when a use case that is not skipped was never captured. */
export function planImages(root: URL, key: string, useCases: UseCase[]): PlannedImage[] {
  const record = readSettingRecord(root, key);
  const images: PlannedImage[] = [];
  for (const useCase of useCases.filter((candidate) => !candidate.skip)) {
    const captured = record?.useCases[useCase.slug];
    if (!captured) {
      throw new Error(`${useCase.file} was never captured: run npm run docs:capture -- -o <scratch org> ${key}`);
    }
    for (const capture of useCase.captures) {
      const shots = captured.captures.find((candidate) => candidate.name === capture.name)!;
      // a clip of the layout applies without a new capture (the raw image is the whole viewport)
      const clip =
        capture.clip === 'viewport'
          ? { x: 0, y: 0, ...shots.viewport }
          : capture.clip === 'auto'
            ? shots.clip
            : capture.clip;
      for (const state of ['before', 'after'] as const) {
        const shot = shots[state];
        const raw = `screenshots/${key}/${shot.file}`;
        const drawn = shot.pills.map((pill) => {
          const spec = capture.pills.find((candidate) => candidate.n === pill.n)!;
          const position = state === 'before' && spec.before ? { ...spec, ...spec.before } : spec;
          return placePill(
            { n: pill.n, box: toClip(pill.box, clip), px: position.px, py: position.py },
            { width: clip.width, height: clip.height },
          );
        });
        images.push(image(root, key, shotFileName(useCase.slug, capture.name, state, 'webp'), raw, clip, drawn));
      }
    }
  }
  const first = images.find((planned) => planned.output.endsWith('-after.webp'));
  if (first) {
    images.push(image(root, key, OVERVIEW_FILE, first.raw, first.clip, []));
  }
  return images;
}

function image(root: URL, key: string, file: string, raw: string, clip: Box, pills: DrawnPill[]): PlannedImage {
  const rawUrl = new URL(raw, root);
  if (!existsSync(rawUrl)) {
    throw new Error(`${raw} is missing: capture the setting ${key} again`);
  }
  return {
    key,
    output: `docs/assets/settings/${key}/${file}`,
    raw,
    clip,
    pills,
    stamp: annotationStamp(readFileSync(rawUrl), clip, pills),
  };
}

/** Images whose file is missing, or whose stamp in `annotated.json` differs from their spec. */
export function staleImages(root: URL, images: PlannedImage[]): PlannedImage[] {
  const stamps = new Map<string, Record<string, string>>();
  const stampsOf = (key: string): Record<string, string> => {
    if (!stamps.has(key)) {
      const file = new URL(annotatedFile(key), root);
      stamps.set(key, existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Record<string, string>) : {});
    }
    return stamps.get(key)!;
  };
  return images.filter(
    (planned) =>
      !existsSync(new URL(planned.output, root)) ||
      stampsOf(planned.key)[planned.output.split('/').pop()!] !== planned.stamp,
  );
}
