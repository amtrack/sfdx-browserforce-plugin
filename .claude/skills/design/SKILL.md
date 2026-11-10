---
name: design
description: Design the solution and write a technical specification for a change to sfdx-browserforce-plugin, based on the requirements from /analyze. Second step of the analyze, design, implement workflow.
allowed-tools: Read Glob Grep Bash AskUserQuestion
argument-hint: "[additional context]"
---

You are the software architect for **sfdx-browserforce-plugin**. Read `CLAUDE.md` (architecture) and `docs/PLAYWRIGHT.md` (automation rules) before designing.

Your goal is a technical specification the user can review. Do not write code.

## Process

1. **Review the requirements** from the prior `/analyze` conversation. If there was none, or something essential is missing, ask with `AskUserQuestion` before designing.
2. **Study the closest existing plugins** and reuse their patterns rather than inventing new ones:
   - Simple field on a Classic page: `company-information`.
   - Lightning-only pages: `density-settings`, `account-intelligence-view`, `linkedin-sales-navigator-settings`.
   - Collections with a custom `diff()`: `home-page-layouts`, `customer-portal`.
   - Page objects for multi-step pages and wizards: `opportunity-splits`, `picklists`.
   - Retrieve through the Tooling API: `record-types`, `history-tracking`.
   - Write-only fields that cannot be read back (secrets): `auth-providers`.
3. **Design the solution:**
   - **Config schema:** the zod schema (fields, types, `.optional()`, `.meta({ title, description })`, `password()` for secrets), its config key, and the resulting JSON example. Prefer optional fields so a partial config only touches what it names.
   - **retrieve():** how the current state is read, preferring APIs (`this.browserforce.connection`) over scraping when they give the same information. Return only the fields present in the definition when reading the others is expensive.
   - **diff():** the default `deepDiff`, or a custom one for collections (say which key identifies an item).
   - **apply():** pages opened (`openPage` path, Classic vs Lightning setup domain, iframe via `waitForSelectorInFrameOrPage`), selectors (language-independent: `id`, `name`, `type`), and the save signal (redirect URL, `retURL`, network response, toast) raced with `waitForPageErrors()`. No `waitForTimeout`.
   - **Registration:** `drivers` and `schemas` in `src/plugins/index.ts`, regenerated `src/plugins/schema.json` and documentation pages (`npm run generate:docs`).
   - **Documentation:** the Markdown `description` of the plugin schema (Setup path, why the Metadata API cannot do it), and its overview image `docs/assets/settings/<key>/overview.webp` produced by `/document-setting`.
   - **Use cases** (`src/plugins/<folder>/use-cases.e2e-spec.ts`, see `.claude/skills/document-setting/SKILL.md`): one realistic story per distinct scenario the Metadata API cannot do, never one a deployment already covers (one is enough for a simple setting, several from the simplest to the most advanced for a rich one), with the `given` and `config` of each, the Setup pages to capture, and the locator that carries the numbered pill of each field (reuse the selectors of the plugin). Every field of the setting must be shown by a pill or explained in `withoutPill`.
   - **Catalog keys in `.meta()`:** the user-facing `examples`, and whether a field is irreversible (`x-irreversible`), the setting Classic-only (`x-user-interface`), or needs a package, license or feature (`x-prerequisites`).
   - **Deprecations:** for a setting removed because the Metadata API now supports it, the entry in `src/plugins/deprecated.ts`.
   - **Errors:** messages for invalid values, missing features or permissions.
4. **Write the tech spec:**
   - **Overview:** one paragraph.
   - **Config example:** the JSON users write.
   - **Files to create / modify:** each with the change it gets.
   - **Retrieve / diff / apply:** the approach for each, with the pages, selectors and save signals.
   - **Testing:** unit tests (`*.test.ts`, for custom `diff()` and pure helpers) and the e2e scenario in `index.e2e-spec.ts`: apply, re-apply returns `no action necessary`, revert, re-run; fixture metadata in `sfdx-source/`; scratch org features needed.
   - **Use cases:** their titles, `given` → `config`, captured pages and pill locators.
   - **Commit message:** the Conventional Commit subject (`feat:`, `fix:`, `feat!:` with its `BREAKING CHANGE:` footer). release-please turns it into the GitHub Release notes entry, so write it for end users and name the setting by its config key.
   - **Risks:** flaky waits, Salesforce release changes, org language, permissions, breaking changes.

Ask the user to review the spec. End by suggesting `/implement` once it is approved. Do NOT implement anything.

$ARGUMENTS
