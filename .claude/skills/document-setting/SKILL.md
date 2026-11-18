---
name: document-setting
description: >
  Write or refresh the documentation of Browserforce settings beyond their schema: the annotated screenshot of each
  setting (numbered pills on the control of each field), taken by an E2E step tagged @capture with CAPTURE=true npm
  run test:e2e in a scratch org, and the hand-written use cases in src/plugins/<folder>/use-cases.md. Use when the
  user asks to document a setting, add or update screenshots or use cases, regenerate the documentation images, or
  after /implement added or changed a setting. With no argument, it handles the settings without screenshot or with a
  missing image.
---

# /document-setting [settingKey ...]

The format is explained in `CONTRIBUTING.md` (section "Screenshots and use cases").

## 1. Pick the settings

- Keys given as arguments.
- No argument: the settings without a `@capture` step or with a missing image (`npm run test -- -g "screenshots"` lists
  them), and those whose plugin, fixtures or selectors changed since their last capture (`git log` of
  `src/plugins/<folder>/*.webp`).

## 2. The scratch org `browserforce-docs`

Never use the user's default target org, a sandbox or a production org: the steps change settings, irreversibly for
some (`x-irreversible`).

1. Reuse `browserforce-docs` while `sf org display -o browserforce-docs --json` says it is Active.
2. Otherwise note the current default (`sf config get target-org --json`), then create it with `npm run develop`
   (`CPQ=true` installs Salesforce CPQ, needed by some captures):

   ```shell
   CPQ=true npm run develop -- -a browserforce-docs -v <devhub> -y 7 --wait 45
   ```

   It sets the new org as default: restore the previous one afterwards (`sf config set target-org <previous>`).
   `<devhub>`: `sf config get target-dev-hub`; when none is set, ask with `AskUserQuestion` among the Connected Dev Hubs
   of `sf org list --json` (`result.devHubs`).
3. **Active scratch org limit reached**: try another Connected Dev Hub, or ask the user before deleting a scratch org.
4. An irreversible config can only be applied once per org: to capture it again, recreate `browserforce-docs`.

## 3. Write the screenshot and the use cases

Read the plugin first: its schema, `retrieve`/`apply` and their selectors, its E2E tests, example JSON files and
`sfdx-source/` fixtures. Then:

- the `@capture` step: [references/capture.md](references/capture.md);
- the use cases: [references/use-cases.md](references/use-cases.md).

Validate without an org: `npm run test -- -g "screenshots"`, `npm run test -- -g "use-cases.md"` and `npx tsc -p test`.

## 4. Capture

```shell
CAPTURE=true CPQ=true SF_TARGET_ORG=browserforce-docs npm run test:e2e -- -g "<PluginClassName>"
```

`-g` takes the `describe` of the setting so its prerequisites run too (`-g @capture` alone skips them). **Never attach
the capture to the user's own Chrome and never automate the desktop** (no SendKeys, no window focus).

## 5. Look at every image

Open every produced image with the Read tool. A screenshot that was not looked at is not verified:

- the right page, framed so the fields are legible (adjust `context`, `height`);
- every pill on the control its legend names;
- no pill covering a label, a value or an icon (move it with `positions`, then capture again);
- nothing personal: no real username or org of the user (scratch org names are fine). The runtime replaces the
  email and username of the org user with `admin@example.com`; hide other personal data with `hide`.

## 6. Finish

Run `npm run test`, `npm run generate:docs` and `npm run format`. Report the settings captured, skipped (with the
reason) and still failing, and propose a `docs:` commit message.
