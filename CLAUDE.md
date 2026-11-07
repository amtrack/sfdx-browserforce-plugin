# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An `sf` CLI plugin (oclif, ESM TypeScript) that applies Salesforce Setup settings that are **not** available in the Metadata API, using Playwright browser automation. Users write a JSON config (`{"settings": {"<pluginKey>": {...}}}`) and run `sf browserforce apply -f config.json -o <org>`. `apply` is idempotent: it only changes what differs from the org's current state.

## Commands

```shell
npm ci && npx playwright install chromium   # setup
npm run build            # tsc -> lib/, oclif manifest + README, regenerate src/plugins/schema.json
npm run test             # typecheck test/ then unit tests (*.test.ts) with nyc coverage
npm run test -- -g "deepDiff"                # run unit tests matching a name
npm run test:format      # prettier check (CI); `npm run format` to fix
npm run generate:schema  # regenerate src/plugins/schema.json from the zod schemas
npm run generate:plugin -- --name MyNewSetting   # scaffold a plugin (hygen, _templates/plugin/new)
npm run develop          # create a scratch org from config/project-scratch-def.json and set it as default (CPQ=true also installs CPQ)
npm run test:e2e -- -g "CompanyInformation"      # e2e tests for one plugin against the DEFAULT org
./bin/run browserforce apply -f src/plugins/<plugin>/enable.json  # run the local build
```

npm scripts use bash syntax (`rm -rf`, `scripts/develop.sh`); on Windows run them from Git Bash. On Windows, `test/commands/browserforce/playwright.test.ts` fails (`spawn npx ENOENT`) and aborts the whole run; exclude it with `npx mocha "test/**/*.test.ts" "src/**/*.test.ts" --ignore test/commands/browserforce/playwright.test.ts` after `npx tsc -p test`.

E2E tests run against the **default target org** (normally a scratch org from `npm run develop`) and need a browser. They must be re-runnable; CONTRIBUTING asks to run a new plugin's e2e test ~7 times in a row to catch flakiness. Debug with env vars `BROWSERFORCE_HEADLESS=false`, `BROWSERFORCE_SLOWMO=1000`, `BROWSERFORCE_TRACE=true` (writes `trace-<timestamp>.zip`, view with `npx playwright show-trace <file>`).

CI (`.github/workflows/default.yml`) runs unit tests, format check, `generate:schema` + `git diff --exit-code src/plugins/schema.json`, then e2e on a fresh scratch org. On `main`, release-please maintains a release Pull Request (version in `package.json` and `.release-please-manifest.json`, `CHANGELOG.md`); merging it tags the release and stages the npm package, which the maintainer approves on npmjs.com. Release-please builds `CHANGELOG.md` from the commit messages, so never edit that file: write Conventional Commits (`feat:`, `fix:`, `feat!:` with a `BREAKING CHANGE:` footer; `refactor:`, `test:`, `chore:`, `ci:`, `docs:` for changes users don't see) whose subject tells users what changed, naming the setting by its config key.

## Architecture

**Execution flow:** `src/commands/browserforce/apply.ts` extends `BrowserforceCommand` (`src/browserforce-command.ts`). Its `init()` reads the config file, rejects removed settings (`src/plugins/deprecated.ts`), resolves `"${VAR}"` values from the environment (`src/env-references.ts`, converted to the type the schema expects, masked in the output), validates and maps `settings` keys to plugin classes (`src/config-parser.ts`), launches Chromium, builds a `Browserforce` instance, and logs in (`src/pages/login.ts`, via the org's frontdoor URL). `run()` then, for each setting: `retrieve()` → `diff()` → `apply(diff)` (skipped with `--dry-run`). `finally()` saves the trace and closes the browser.

**`Browserforce`** (`src/browserforce.ts`) is the shared context passed to every plugin: the jsforce `connection` (use it for API/SOQL/Tooling/Metadata calls when possible), the Playwright `browserContext`, `openPage(path)` (paths starting with `/lightning` go to the `*.my.salesforce-setup.com` domain, others to the instance URL; wrapped in retry and page-error detection from `src/page-errors.ts`), `waitForSelectorInFrameOrPage()` (Classic pages rendered inside a LEX Visualforce iframe), and `retry()` (p-retry, configured by `--max-retries`/`--retry-timeout`).

**Plugins** (`src/plugins/<kebab-name>/index.ts`) extend `BrowserforcePlugin` (`src/plugin.ts`) and implement `retrieve(definition)` (current org state, in the config's shape) and `apply(plan)`. `diff()` defaults to `deepDiff` from `src/plugins/utils.ts`, which returns `undefined` when nothing changes; override it only for arrays/collections keyed by name (see `customer-portal`, `home-page-layouts`; `semanticallyCleanObject` helps). Large plugins split into sub-plugins (`customer-portal/{enabled,portals,available-custom-objects}`) and/or page objects in `pages/` (`picklists`, `opportunity-splits`).

**Config schema:** each plugin exports a zod schema `<camelName>Schema` with `.meta({ id: '<camelName>', title })`, and its config type is `z.infer<typeof schema>`. A new plugin must be registered in `drivers` and `schemas` in `src/plugins/index.ts` (the scaffolder does this; the typed maps fail the build when one is missing); the config key is the camelCase plugin name. `src/plugins/schema.ts` builds the strict root schema; `src/plugins/schema.json` is **generated** and committed. Never edit it by hand, rerun `npm run generate:schema`. Wrap secret fields with `password(...)` from `src/plugins/utils.ts` so `apply` output masks them.

**Discovery without an org:** `sf browserforce plugins list` returns the catalog built by `src/plugin-catalog.ts` (per setting: JSON Schema with `$ref` inlined, flat fields from `src/json-schema-utils.ts`, examples and warnings from the `.meta()` of the schema: `examples`, `x-irreversible` on fields, `x-user-interface`, `x-prerequisites`, plus the deprecated settings). sfdx-hardis deployment actions consume it, so its JSON shape is an API: add fields freely, but bump `CATALOG_FORMAT_VERSION` when removing or renaming one. `sf browserforce plugins validate` runs `ConfigParser.validate()` with `${VAR}` placeholders accepted. Neither extends `BrowserforceCommand`, so they never need an org or a browser.

**Plugin folder conventions:** `index.ts`, `index.e2e-spec.ts` (uses `global.browserforce` from `test/e2e-setup.ts` and calls `plugin.run(config)`, asserting the second run returns `{ message: 'no action necessary' }`), example config JSONs for manual runs, and optionally `sfdx-source/` with fixture metadata that the e2e test deploys via `sf project deploy start -d`. Unit tests are `*.test.ts` (in `test/` or next to the plugin); e2e tests are `*.e2e-spec.ts` and excluded from coverage.

## Playwright conventions (from `docs/PLAYWRIGHT.md`)

- Open pages with `await using page = await this.browserforce.openPage(...)` so they are closed even on error.
- Use the Locator API; avoid `evaluate()`, `waitForTimeout()` and `waitForLoadState()`. Wait for a concrete signal (URL, response, locator state) instead.
- Use language-independent selectors (`name`, `id`, `type`), not labels/titles that change with the user's locale.
- When saving, start waiting for both the success signal and `waitForPageErrors()` before or right after the click, e.g. `Promise.race([waitForPageErrors(page), page.waitForURL(...)])`. Classic pages usually redirect after save (set `retURL` if needed); Lightning SPA pages often need `page.waitForResponse(...)`.
- Three kinds of setup pages: Classic, Classic inside a LEX iframe (`waitForSelectorInFrameOrPage`), and Lightning-only.

## Contribution workflow (project skills in `.claude/skills/`)

- `/analyze`: reads the code, then asks the user questions until the change is fully specified (setting, Setup page, config JSON, idempotency, org prerequisites).
- `/design`: turns the analysis into a tech spec (schema, retrieve/diff/apply, selectors and save signals, tests, commit message). No code.
- `/implement`: implements, runs build + unit tests + format, runs e2e tests only on a scratch default org (asks otherwise), then runs `/code-review high --fix`, re-verifies and proposes the commit message.

## Other notes

- `.fallowrc.json` configures the `fallow` dead-code/duplication checker; `// fallow-ignore-next-line` comments are intentional.
- Settings that Salesforce later supports in the Metadata API, or retires, are removed and listed in `src/plugins/deprecated.ts` with a pointer to the wiki "Hall of Fame".
