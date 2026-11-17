---
name: document-setting
description: Write or refresh the documentation of Browserforce settings beyond their schema: the annotated screenshot of each setting (numbered pills on the control of each field), taken by an E2E step tagged @capture with CAPTURE=true npm run test:e2e in a scratch org, and the hand-written use cases in src/plugins/<folder>/use-cases.md. Use when the user asks to document a setting, add or update screenshots or use cases, regenerate the documentation images, or after /implement added or changed a setting. With no argument, it handles the settings without screenshot or with a missing image.
---

# /document-setting [settingKey ...]

The page of a setting on the documentation site shows, below its description, its **screenshot**: the Setup page with
a numbered pill on the control of each field, and a legend mapping each pill to its field. Then its **use cases**:
hand-written stories with their config, in `src/plugins/<folder>/use-cases.md`.

The screenshot is taken by a step of the E2E test of the setting, tagged `@capture` in its title and wrapped by
`capture()` from `test/capture.ts`. `npm run test:e2e` runs it like any step. With `CAPTURE=true`, it also takes one
screenshot per capture, after the step (or before it with `screenshot: 'before'`), and draws the pills into
`src/plugins/<folder>/<capture>.webp`. The E2E tests around it arrange the org (fixtures, prerequisites) and check
idempotency.

Read `CLAUDE.md` first. The tooling:

| What | Where |
| --- | --- |
| `capture(schema, definition, step?)`: the helper of the tests | `test/capture.ts` |
| The `UseCaseDefinition` and `UseCaseDoc` API, checks, loading the `capture()` tests from the E2E tests | `scripts/use-cases.ts` |
| Runtime: scratch org check, shooting the captures, drawing the pills into WebP images | `scripts/use-case-doc.ts`, `test/e2e-setup.ts` |
| Palette, clip, pill placement | `scripts/screenshots.ts` |
| Documentation images | `src/plugins/<folder>/*.webp` (generated, never edit them; `generate:docs` copies them to the git-ignored `docs/assets/plugins/`) |
| Use cases (stories and config, Markdown) | `src/plugins/<folder>/use-cases.md` (hand-written) |
| Page rendering | `renderScreenshots()`, `renderUseCases()` in `scripts/docs-pages.ts` |
| Consistency checks | `test/use-cases.test.ts` |

## 1. Pick the settings

- Keys given as arguments.
- No argument: the settings without a `@capture` step or with a missing image (`npm run test -- -g "screenshots"` lists
  them), and those whose plugin, fixtures or selectors changed since their last capture (`git log` of
  `src/plugins/<folder>/*.webp`).

## 2. The scratch org

Never use the default target org of the user, and never a sandbox or a production org: the steps change settings,
irreversibly for some (`x-irreversible`). With `CAPTURE=true`, `test/e2e-setup.ts` refuses any org that is not a
scratch org or whose user does not see Setup in `en_US`.

1. Reuse the scratch org `browserforce-docs` while `sf org display -o browserforce-docs --json` says it is Active.
2. Otherwise create it from the Dev Hub of `sf config get target-dev-hub`; when none is set, list the Connected Dev
   Hubs of `sf org list --json` (`result.devHubs`) and ask with `AskUserQuestion`:

   ```shell
   sf org create scratch -f config/project-scratch-def.json -a browserforce-docs -v <devhub> -y 7 --wait 45
   sf package install --package 04tKh000001zrocIAA -o browserforce-docs --no-prompt --wait 30   # Salesforce CPQ
   ```

   Do not pass `--set-default`. The E2E tests deploy their own fixtures (`sfdx-source/`).
3. **Active scratch org limit reached** ("has reached its active scratch org limit"): try another Connected Dev Hub.
   Scratch orgs of an **orgfarm** Dev Hub (instance `orgfarm-*-dev-ed`) may be deleted without asking to free a slot
   (`sf org list --json` → `result.scratchOrgs`, `sf org delete scratch -o <alias> -p`); the user allowed it. For any
   other Dev Hub, ask first.
4. An irreversible config can only be applied once per org: to capture its screenshot again, delete
   `browserforce-docs` (orgfarm Dev Hub), create it again and capture again.

## 3. Write the screenshot and the use cases

Read the plugin first: its zod schema, `retrieve`/`apply` and the selectors they use, its E2E tests, its example JSON
files and `sfdx-source/` fixtures.

**The screenshot** is a step of an existing E2E test whose resulting page shows the fields: tag its title with
`@capture` and wrap it with `capture()`. One capture per setting, named `screenshot` (the file name of its image);
several only when the fields live on different pages (the tabs of `salesforce-cpq-config`, the parts of `security`),
named after their page and unique per setting. A pill per field the page shows; a field the page cannot show simply
has none (the fields table of the page documents every field).

```ts
import { capture } from '../../../test/capture.js';
import { companyInformationSchema, CURRENCY_DROPDOWN_SELECTOR } from './index.js';

it(
  'should set the currency to "English (South Africa) - ZAR" @capture', // the tag marks the step that shoots
  capture(companyInformationSchema, {
    config: { defaultCurrencyIsoCode: 'English (South Africa) - ZAR' }, // the step, typed by the schema of the setting
    // screenshot: 'before', // when the config removes what the screenshot shows (a deleted or renamed value)
    // the captures, by name: with CAPTURE=true, each is shot in the page that retrieve(config) of the plugin opens, just
    // before it closes it, after the step; selectors are looked up in the page or its Classic iframe
    pages: {
      screenshot: {
        // when retrieve() opens no page to show (API only, a record, a tab to click), open it with the plugin's paths:
        // async open(doc) {
        //   const page = await doc.open(`/${await doc.recordId('SELECT Id FROM ...')}`);
        //   await doc.click(page, 'a[data-label="Details"]'); // a tab or a link, never Save
        //   return page;
        // },
        // path: 'CustomerSuccessPortalSetup/d', // a part of the path, when retrieve() opens other pages first
        height: 900, // of the viewport; width is always 1440
        context: ['#ep .pbBody'], // frames the image with the pills
        hide: [], // controls hidden before the shot
        pills: {
          defaultCurrencyIsoCode: CURRENCY_DROPDOWN_SELECTOR, // concrete path in config: a selector of the plugin
        },
        // title: 'Company Information', // caption, when the setting has several captures (default: from the name)
        // clip: { x: 240, y: 130, width: 1180, height: 400 }, // default: around the pills and the context
        // positions: { defaultCurrencyIsoCode: { px: 50, py: 20 } }, // of pills, in % of the image
      },
    },
  }),
  // optional third argument: the step, when the test does more than apply `config` (it must return what
  // plugin.run() returns)
);
```

- What the screenshot needs before the step (another setting, records, fixtures, the state a `'before'` screenshot
  shows) is an `it` before it, like the other prerequisites of the E2E tests.
- Prefer the page `retrieve()` opens: the test then names no URL, only the controls. The first `context` selector
  (else the first pill) is waited for, in the page or its Classic iframe. Use `open()` only when `retrieve()` reads
  the API or another page, with the paths exported by the plugin (`BASE_PATH`, `getUrl()` of its page objects).
- In `open()`, `doc.recordId(soql, { tooling, short })` gives the Id of a record for a path; `doc.click(page, selector)`
  opens a tab or a link (never Save).
- **Reuse the selectors of the plugin** when they point at the control (export them from its `index.ts`):
  `salesforce-cpq-config` takes every control from its `formConfig`.
- Pills are numbered in the order of `pages` and of their `pills`.
- Selectors may use English text (`tr:has(th:text-is("Other"))`): the screenshots are only taken in an `en_US` org,
  and must be CSS (Playwright pseudo-classes like `:has()`, `:text-is()` are fine): `waitForSelectorInFrameOrPage`
  joins them with the iframe selector by a comma.
- A Lightning page can show its controls before their values are loaded. Make the first pill wait for its content,
  e.g. `lightning-combobox:has-text("Compact")`, so the shot is not taken mid-loading.
- A control below the fold fails with "outside the viewport": give the capture a larger `height`.
- Reframing (`clip`, `positions`) needs a new capture: an explicit `clip` box applies to the screenshot of the whole
  viewport.
- A setting a scratch org cannot show (an external app, a feature the scratch definition cannot enable) has no
  screenshot: add it to `WITHOUT_SCREENSHOT` in `test/use-cases.test.ts` with the reason.

**The use cases** (`src/plugins/<folder>/use-cases.md`, optional; `npm run generate:plugin` creates a placeholder to
replace or delete) are for an end user, an admin who never read the
code. Per use case: a `##` heading, the story (a named company, its admin's need, one sentence on why the Metadata API
cannot do it, what the config changes; three to six sentences) and its config as a `json` block with `$schema`. Only
what the Metadata API cannot do: a setting the Metadata API now covers belongs in `src/plugins/deprecated.ts`, report
it to the user instead of documenting it. Order them from the simplest to the most advanced.

Validate without an org: `npm run test -- -g "screenshots"` (it reads the `capture()` steps from the E2E tests and
checks them), `npm run test -- -g "use-cases.md"` (the `json` blocks of `use-cases.md` must parse) and `npx tsc -p test`
(the configs are typed by the schema of the setting).

## 4. Capture

```shell
CAPTURE=true CPQ=true SF_TARGET_ORG=browserforce-docs npm run test:e2e -- -g "<describe of the setting>"   # e.g. CompanyInformation
```

`-g` takes the title of the `describe` of the setting (the name of its plugin class), so its prerequisites run too;
`-g @capture` alone would skip them. Without `-g`, every E2E test runs and every screenshot is taken.
`BROWSERFORCE_HEADLESS=false` shows the browser, `BROWSERFORCE_BROWSER_CHANNEL=chrome` uses the installed Chrome.
**Never attach the capture to the user's own Chrome and never automate the desktop** (no SendKeys, no window focus) to
take a screenshot.

## 5. Look at every image

Open every produced image with the Read tool. A screenshot that was not looked at is not
verified:

- the right page, framed so the fields are legible (adjust `context`, `height`, `clip`);
- every pill on the control its legend names;
- no pill covering a label, a value or an icon (move it with `positions`, then capture again);
- nothing personal: no real username or org of the user (scratch org names are fine). The runtime replaces the
  email and the username of the org user with `admin@example.com` in every page before each shot (the email of a
  scratch org user is the one of the Dev Hub user), but other personal data must be hidden with `hide`.

An explicit `clip` can reveal more of the viewport than the automatic one: check what it shows.

## 6. Finish

```shell
npm run test                 # test/use-cases.test.ts: every setting has a screenshot, valid pills, images exist
npm run generate:docs        # the Screenshot and Use cases sections of docs/settings/<key>.md
npm run format
```

The schema description of a setting references its screenshot (`src/plugins/<folder>/screenshot.webp`), so
`plugins list`, `schema.json` and sfdx-hardis show it; its page does not repeat it.

Report the settings captured, skipped (with the reason) and still failing, and propose a `docs:` commit message.
