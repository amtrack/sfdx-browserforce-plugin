# The `@capture` step

| What | Where |
| --- | --- |
| `capture(schema, definition, step?)`: the helper of the tests | `test/capture.ts` |
| The `UseCaseDefinition` and `UseCaseDoc` API, checks, loading the `capture()` tests from the E2E tests | `scripts/use-cases.ts` |
| Runtime: scratch org check, shooting the captures, drawing the pills into WebP images | `scripts/use-case-doc.ts`, `test/e2e-setup.ts` |
| Palette, crop, CSS of the pills (anchor positioning) | `scripts/screenshots.ts` |
| Page rendering | `renderScreenshots()`, `renderUseCases()` in `scripts/docs-pages.ts` |
| Consistency checks | `test/use-cases.test.ts` |

Tag the title of an existing E2E step whose resulting page shows the fields with `@capture` and wrap it with
`capture()`. One capture per setting, named `screenshot` (the file name of its image); several only when the fields
live on different pages (the tabs of `salesforce-cpq-config`, the parts of `security`), named after their page and
unique per setting. A pill per field the page shows; a field the page cannot show has none.

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
        // positions: { defaultCurrencyIsoCode: 'left' }, // side of the control: right (default), left, top, bottom, inside
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
- The image is cropped around the pills and the `context` (at least 960×420): frame it with `context` selectors (a
  heading, a section), never with coordinates. Pills are popovers anchored to their control: right of it, else left,
  above, below when the viewport (or the Classic iframe of the control: a pill cannot leave it) is too narrow;
  `positions` picks the side, without fallback, when the default covers a label or another pill (`inside`: in the
  right end of a wide control, like a table row). When no side fits, point the pill at another element of the field,
  like its `label[for="..."]`.
- A setting a scratch org cannot show (an external app, a feature the scratch definition cannot enable) has no
  screenshot: add it to `WITHOUT_SCREENSHOT` in `test/use-cases.test.ts` with the reason.
