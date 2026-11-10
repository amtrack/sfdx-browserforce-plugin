---
name: document-setting
description: Write or refresh the real-life use cases of Browserforce settings and their annotated before/after screenshots (numbered pills), taken by running them as E2E tests in a scratch org through a dedicated Chrome over CDP. Use when the user asks to document a setting, add or update use cases or screenshots, regenerate the documentation images, or after /implement added or changed a setting. With no argument, it handles the settings whose use cases are missing or stale.
---

# /document-setting [settingKey ...]

Each setting of **sfdx-browserforce-plugin** has one or more **use cases**, defined in TypeScript in
`src/plugins/<folder>/use-cases.e2e-spec.ts`. Its page on the documentation site shows each use case as a story, the
config, and "Before"/"After" screenshots of the Setup page with a numbered pill on each field, plus a legend mapping
each pill to its config field.

The use cases are E2E tests: `npm run docs:capture` runs them in a scratch org (apply `given`, shoot "Before", apply
`config`, check a second run is "no action necessary", shoot "After", apply `given` again). They are not part of
`npm run test:e2e`: they need the docs scratch org and its fixtures.

Read `CLAUDE.md` first. The tooling:

| What | Where |
| --- | --- |
| `defineUseCases()`, the `UseCaseDoc` API, checks, staleness hash | `scripts/use-cases.ts` |
| Runtime: dedicated Chrome over CDP, `doc.shot()`, records | `scripts/use-case-doc.ts`, `test/docs-setup.ts` |
| Capture CLI (selection, `--stale`, `--plan`), spawns mocha | `scripts/capture-use-cases.ts`, `npm run docs:capture` |
| Palette, clip, pill placement, records | `scripts/screenshots.ts` |
| Pills drawn into WebP images, no org needed | `scripts/annotate-screenshots.ts`, `npm run docs:annotate` |
| Raw screenshots, boxes, pills, stamps | `screenshots/<key>/` (committed, not published) |
| Documentation images | `docs/assets/settings/<key>/` (generated, never edit them) |
| Page rendering | `renderUseCases()` in `scripts/docs-pages.ts` |
| Consistency checks | `test/use-cases.test.ts` |

## 1. Pick the settings

- Keys given as arguments: their use cases.
- No argument: `npm run docs:capture -- --list-stale` (never captured, or `given`/`config`, the code of `shoot()`,
  `prepare()` and the helpers above `defineUseCases()`, the plugin code or its `sfdx-source/` changed since), plus the
  settings with no use case file at all (`npm run test -- -g "use cases"`).

## 2. The scratch org

Never use the default target org of the user, and never a sandbox or a production org: the use cases change settings,
irreversibly for some (`x-irreversible`). The runtime refuses any org that is not a scratch org or whose user does not
see Setup in `en_US`.

1. Reuse the scratch org `browserforce-docs` while `sf org display -o browserforce-docs --json` says it is Active.
2. Otherwise create it from the Dev Hub of `sf config get target-dev-hub`; when none is set, list the Connected Dev
   Hubs of `sf org list --json` (`result.devHubs`) and ask with `AskUserQuestion`:

   ```shell
   sf org create scratch -f config/project-scratch-def.json -a browserforce-docs -v <devhub> -y 7 --wait 45
   sf package install --package 04tKh000001zrocIAA -o browserforce-docs --no-prompt --wait 30   # Salesforce CPQ
   for d in $(find src/plugins -type d -name sfdx-source); do sf project deploy start -d "$d" -o browserforce-docs --wait 20; done
   ```

   Do not pass `--set-default`. Deploy one setting's `sfdx-source/` again when it changed. The `ServiceChannel`
   fixtures only deploy while the status-based capacity model of `omniChannelSettings` is off. In a new org, deploy
   the `user-access-policies` fixtures twice: the first deploy of a policy left it without its user criteria.
3. **Active scratch org limit reached** ("has reached its active scratch org limit"): try another Connected Dev Hub.
   Scratch orgs of an **orgfarm** Dev Hub (instance `orgfarm-*-dev-ed`) may be deleted without asking to free a slot
   (`sf org list --json` → `result.scratchOrgs`, `sf org delete scratch -o <alias> -p`); the user allowed it. For any
   other Dev Hub, ask first.
4. When a use case fails with "the org already has its irreversible config", its "Before" can only be taken in a new
   org: capture the reversible use cases first, then delete `browserforce-docs` (orgfarm Dev Hub), create it again
   and capture the irreversible ones (`npm run docs:capture -- --plan` flags them).

## 3. Write the use cases

Read the plugin first: its zod schema, `retrieve`/`apply` and the selectors they use, its e2e test, its example JSON
files and `sfdx-source/` fixtures.

**Only what the Metadata API cannot do.** Browserforce exists for the settings the Metadata API does not cover, so a
use case never shows a scenario a deployment can already do (adding a picklist value, activating a field's history
tracking...), even when the plugin supports it. Check each scenario against the Metadata API (Settings types,
`CustomObject`, `CustomField`, `StandardValueSet`, `GlobalValueSet`, `Profile`...) and the official documentation
when unsure. A field only used by such a scenario goes to `withoutPill` with that reason. A whole setting that the
Metadata API now covers belongs in `src/plugins/deprecated.ts`: report it to the user instead of documenting it.

**The story** is for an end user, an admin who never read the code: a named company, its admin's need, one sentence
on why the Metadata API cannot do it, and what the config changes. Three to six sentences, one string per paragraph.
Cite the pills in bold, `**(1)**` or `**Currency Locale (1)**`; the page paints them in the colour of their pill. No
`TODO`.

**One use case per setting covers all its fields**, unless the setting holds distinct scenarios: then several, ordered
from the simplest to the most advanced (`picklists` goes from adding a value to field dependencies). Across the use
cases of a setting, every field of the catalog must be shown, by a pill or a `withoutPill` entry with the reason.

A use case (`UseCaseDefinition` in `scripts/use-cases.ts` documents every key):

```ts
import { defineUseCases } from '../../../scripts/use-cases.js';
import { companyInformationSchema } from './index.js';

export const useCases = defineUseCases(companyInformationSchema, [
  {
    slug: '01-south-african-subsidiary', // order on the page, prefix of the images
    title: 'A South African subsidiary invoices in rand',
    given: { defaultCurrencyIsoCode: 'English (United States) - USD' }, // applied before "Before", again after
    config: { defaultCurrencyIsoCode: 'English (South Africa) - ZAR' }, // typed by the schema of the setting
    // restore: false,                    // keep `config` applied (another use case needs it)
    story: ['Acme opened a subsidiary in South Africa ...', 'This config sets the **Currency Locale (1)** ...'],
    withoutPill: { 'items[0].secret': 'masked by the page' },
    // how the images are drawn: only `npm run docs:annotate` again, no new capture
    captures: {
      'company-information': {
        title: 'Company Information', // caption, only shown when the use case has several captures
        clip: { x: 240, y: 130, width: 1180, height: 400 }, // default: around the pills and the context
        pills: { defaultCurrencyIsoCode: { px: 50, py: 20, before: { py: 30 } } }, // in % of the image
      },
    },
    // async prepare(doc) { await doc.apply(omniChannelSettingsSchema, { enableStatusBasedCapacityModel: true }); },
    async shoot(doc) {
      // runs twice: doc.state is 'before', then 'after'
      await using page = await doc.open(`/${doc.orgId}/e`, { height: 900 }); // width is always 1440
      const ui = await doc.within(page, '#ep'); // the page, or its Classic iframe in Lightning
      await doc.shot('company-information', page, {
        context: [ui.locator('#ep .pbBody')], // frames the image with the pills
        hide: [], // controls hidden before the shot
        pills: {
          defaultCurrencyIsoCode: ui.locator('#DefaultCurrencyIsoCode'), // concrete path in config
          // 'values[1].name': { locator: ui.locator('tr:has-text("New")'), in: 'after' }, // one image only
        },
      });
    },
  },
]);
```

- `doc.recordId(soql, { tooling, short })` gives the Id of a record for a path; `doc.click(page, selector)` opens a tab
  or a link (never Save); `doc.apply(schema, config)` sets another setting the use case needs.
- **Reuse the selectors of the plugin** when they point at the control (export them from its `index.ts`):
  `salesforce-cpq-config` takes every control from its `formConfig`.
- Pills are numbered in the order of the `doc.shot()` calls and of their `pills`. Both passes must declare the same
  pills: a control that exists in one state only gets `in: 'before'` or `in: 'after'`.
- `given` shows the opposite of `config`, so "Before" and "After" differ; the run fails when `config` changes nothing,
  or when a second run of `config` is not "no action necessary". Without `given`, "Before" is whatever the org has.
- Selectors may use English text (`tr:has(th:text-is("Other"))`): use cases only run in an `en_US` org.
- The selector given to `doc.within()` must be CSS (Playwright pseudo-classes like `:has()`, `:text-is()` are fine):
  `waitForSelectorInFrameOrPage` joins it with the iframe selector by a comma. Choose one present in both states.
- A Lightning page can show its controls before their values are loaded. Make the first pill wait for its content,
  e.g. `lightning-combobox:has-text("Compact")`, so the shot is not taken mid-loading.
- A control below the fold fails with "outside the viewport": open the page with a larger `height`.
- Reframing (`captures.<name>.clip`, pill positions) only needs `npm run docs:annotate`: an explicit `clip` box applies
  to the raw screenshot of the whole viewport, so an irreversible use case can be reframed without a new scratch org.
- `skip: '<reason>'` is for what a scratch org cannot host (an external app, a real secret, a feature the scratch
  definition cannot enable). The use case is still written, and its page shows the story and the config.

Validate without an org: `npm run docs:capture -- --plan <keys>` (it checks every use case, then prints the order),
and `npx tsc -p test` (the configs are typed by the schema of the setting).

## 4. Capture, annotate, generate

```shell
npm run docs:capture -- -o browserforce-docs <keys>      # or --stale; <key>/<slug> for one use case; --headed to watch
npm run docs:annotate -- <keys>
```

Mocha runs the files by plugin folder, the use cases of a file in their order, the irreversible ones last. Settings
that restyle every page (`densitySettings`, `lightningExperienceSettings`) rely on `restore`.

The runtime starts its own Chrome (installed Google Chrome, else Playwright's Chromium, or `BROWSERFORCE_DOCS_CHROME`)
with a free debugging port and a temporary profile, connects with `connectOverCDP`, and kills only that process.
**Never attach the capture to the user's own Chrome, never call `browser.close()` on a browser you did not start, and
never automate the desktop** (no SendKeys, no window focus) to take a screenshot.

## 5. Look at every image

Open every produced image with the Read tool, both "Before" and "After". A screenshot that was not looked at is not
verified:

- the right page, framed so the fields are legible (adjust `context`, `height`, `clip`);
- every pill on the control its legend names, "Before" and "After" visibly different;
- no pill covering a label, a value or an icon (move it in `captures`, then only `npm run docs:annotate`);
- nothing personal: no real username or org of the user (scratch org names are fine). The runtime replaces the
  email and the username of the org user with `admin@example.com` in every page before each shot (the email of a
  scratch org user is the one of the Dev Hub user), but other personal data must be hidden with `hide`.

The raw screenshots in `screenshots/<key>/` are committed too and show the whole viewport, not only the published
part: open them as well before a commit.

## 6. Finish

```shell
npm run test                 # test/use-cases.test.ts: valid use cases, every field shown, images match their stamps
npm run generate:docs        # the Use cases sections of docs/settings/<key>.md
npm run format
```

The overview image of a setting (`docs/assets/settings/<key>/overview.webp`, the first "After" without pills) is the
one its schema description references, so `plugins list`, `schema.json` and sfdx-hardis show it. When a setting gets
its first capture, point its description to it and delete the old PNG if nothing else uses it.

Report the settings captured, skipped (with the reason) and still failing, and propose a `docs:` commit message.
