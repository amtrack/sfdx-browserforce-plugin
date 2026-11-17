/**
 * `capture()` adds the annotated screenshots of a setting, shown on its page, to a step of its E2E test. Tag the title of
 * the test with `@capture`:
 *
 *   it('should enable Sales Cloud for Slack @capture', capture(slackSchema, { config, pages: { screenshot: { ... } } }));
 *
 * The test applies `config` (or the step passed as third argument). With
 * CAPTURE=true (`test/e2e-setup.ts` then checks the org is a scratch org), it also takes one screenshot per capture after
 * the step (or before it with `screenshot: 'before'`), of the pages of `pages`: `CAPTURE=true npm run test:e2e [-- -g <setting>]`.
 */
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { z } from 'zod';
import { runCapture } from '../scripts/use-case-doc.js';
import {
  CAPTURE_TAG,
  type CaptureTestData,
  settingKey,
  toUseCase,
  type UseCaseDefinition,
} from '../scripts/use-cases.js';

const root = new URL('../', import.meta.url);

export function capture<S extends z.ZodType>(
  schema: S,
  definition: UseCaseDefinition<z.input<S>>,
  step?: () => Promise<unknown>,
): Mocha.AsyncFunc & { useCase: CaptureTestData } {
  const key = settingKey(schema);
  const test = async function (this: Mocha.Context): Promise<void> {
    if (!this.test?.title.includes(CAPTURE_TAG)) {
      throw new Error(`The title of a capture() test must include ${CAPTURE_TAG}: "${this.test?.title}"`);
    }
    const capturing = process.env.CAPTURE === 'true';
    if (capturing) {
      // the screenshots take minutes more
      this.timeout(Math.max(this.timeout(), 15 * 60_000));
    }
    const file = this.test.file && relative(fileURLToPath(root), this.test.file);
    const useCase = toUseCase(key, definition as UseCaseDefinition<unknown>, file);
    await runCapture(global.browserforce, useCase, {
      capture: capturing,
      identities: globalThis.captureIdentities ?? [],
      step,
    });
  };
  return Object.assign(test, { useCase: { key, definition: definition as UseCaseDefinition<unknown> } });
}
