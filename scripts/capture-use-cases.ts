/**
 * Runs the use cases of the settings in a scratch org as E2E tests, which take their "Before" and "After"
 * screenshots (`src/plugins/<folder>/use-cases.e2e-spec.ts`, see scripts/use-cases.ts).
 *
 *   npm run docs:capture -- -o browserforce-docs companyInformation picklists   # these settings
 *   npm run docs:capture -- -o browserforce-docs picklists/02-replace-a-value   # one use case
 *   npm run docs:capture -- -o browserforce-docs --stale                        # the missing or stale captures
 *   npm run docs:capture -- --list-stale                                        # list them, without an org
 *   npm run docs:capture -- --plan [keys]                                       # the order, without an org
 *   npm run docs:capture -- -o browserforce-docs --headed picklists             # watch the browser
 *
 * It checks the use cases, then runs mocha on their files with `test/docs-setup.ts`, which drives a Chrome of its
 * own over the Chrome DevTools Protocol and refuses any org that is not a scratch org. The raw screenshots and the
 * boxes of the controls go to `screenshots/<key>/`; `npm run docs:annotate` then draws the pills.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { schemas } from '../src/plugins/index.js';
import { readSettingRecord } from './screenshots.js';
import {
  captureHash,
  checkUseCases,
  fieldsOf,
  isIrreversible,
  loadUseCases,
  runOrder,
  USE_CASES_FILE,
  type UseCase,
} from './use-cases.js';

const root = new URL('../', import.meta.url);

type Options = { org?: string; keys: string[]; stale: boolean; listStale: boolean; plan: boolean; headed: boolean };

function parseArgs(args: string[]): Options {
  const options: Options = { keys: [], stale: false, listStale: false, plan: false, headed: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-o' || arg === '--target-org') {
      options.org = args[++i];
    } else if (arg === '--stale') {
      options.stale = true;
    } else if (arg === '--list-stale') {
      options.listStale = true;
    } else if (arg === '--plan') {
      options.plan = true;
    } else if (arg === '--headed') {
      options.headed = true;
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option ${arg}`);
    } else {
      options.keys.push(arg);
    }
  }
  return options;
}

const isStale = (useCase: UseCase): boolean =>
  !useCase.skip && readSettingRecord(root, useCase.key)?.useCases[useCase.slug]?.hash !== captureHash(root, useCase);

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const all = await loadUseCases(root);
  // a setting key, or `<key>/<use case>` for one use case of a setting
  const settingKeys = options.keys.map((name) => name.split('/')[0]);
  const unknown = options.keys.filter(
    (name) =>
      !all.has(name.split('/')[0]) ||
      (name.includes('/') &&
        !all.get(name.split('/')[0])!.some((useCase) => `${useCase.key}/${useCase.slug}` === name)),
  );
  if (unknown.length > 0) {
    throw new Error(`Unknown settings or use cases: ${unknown.join(', ')}`);
  }
  // only the settings named, so a use case being written for another setting does not block this one
  const problems = [...all.entries()]
    .filter(([key]) => settingKeys.length === 0 || settingKeys.includes(key))
    .flatMap(([key, useCases]) =>
      checkUseCases(useCases, fieldsOf(key), schemas[key as keyof typeof schemas], { captured: false }),
    );
  if (problems.length > 0) {
    throw new Error(`Invalid use cases:\n- ${problems.join('\n- ')}`);
  }
  let selected = [...all.values()].flat();
  if (options.keys.length > 0) {
    selected = selected.filter(
      (useCase) => options.keys.includes(useCase.key) || options.keys.includes(`${useCase.key}/${useCase.slug}`),
    );
  }
  if (options.stale || options.listStale) {
    selected = selected.filter(isStale);
  }
  const ordered = runOrder(selected);
  if (options.listStale || options.plan) {
    for (const useCase of ordered) {
      const flags = [
        useCase.skip ? `skipped: ${useCase.skip}` : '',
        isIrreversible(useCase, fieldsOf(useCase.key)) ? 'irreversible' : '',
      ]
        .filter(Boolean)
        .join(', ');
      console.log(`${useCase.key}/${useCase.slug}${flags ? ` (${flags})` : ''}`);
    }
    return;
  }
  if (!options.org) {
    throw new Error('Name the scratch org with -o <alias>');
  }
  if (options.keys.length === 0 && !options.stale) {
    throw new Error('Name the settings to capture, or pass --stale');
  }
  const runnable = ordered.filter((useCase) => !useCase.skip);
  if (runnable.length === 0) {
    console.log('Nothing to capture.');
    return;
  }
  // mocha titles are "<key> <slug>"
  const grep = `^(${runnable.map((useCase) => escapeRegExp(`${useCase.key} ${useCase.slug}`)).join('|')})$`;
  const files = [...new Set(runnable.map((useCase) => `src/plugins/${useCase.folder}/${USE_CASES_FILE}`))];
  // node runs the bin of mocha directly: `npx` cannot be spawned without a shell on Windows
  const mocha = fileURLToPath(new URL('node_modules/mocha/bin/mocha.js', root));
  const child = spawn(
    process.execPath,
    [mocha, '--slow', '60s', '--timeout', '15m', '--file', 'test/docs-setup.ts', '--grep', grep, ...files],
    {
      cwd: fileURLToPath(root),
      stdio: 'inherit',
      env: {
        ...process.env,
        BROWSERFORCE_DOCS_ORG: options.org,
        ...(options.headed ? { BROWSERFORCE_DOCS_HEADED: 'true' } : {}),
      },
    },
  );
  const code = await new Promise<number>((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (exitCode) => resolve(exitCode ?? 1));
  });
  if (code === 0) {
    console.log('Next: npm run docs:annotate');
  }
  process.exitCode = code;
}

await main();
