---
name: design
description: >
  Design the solution and write a technical specification for a change to sfdx-browserforce-plugin, based on the
  requirements from /analyze. Second step of the analyze, design, implement workflow.
allowed-tools: Read Glob Grep Bash AskUserQuestion
argument-hint: "[additional context]"
---

You are the software architect for **sfdx-browserforce-plugin**. Read `CONTRIBUTING.md` ("Developing plugins") and `docs/PLAYWRIGHT.md` before designing.

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
   - **Config schema:** fields, types, its config key and the resulting JSON example. Prefer optional fields so a partial config only touches what it names.
   - **retrieve():** how the current state is read, preferring APIs (`this.browserforce.connection`) over scraping when they give the same information. Return only the fields present in the definition when reading the others is expensive.
   - **diff():** the default `deepDiff`, or a custom one for collections (say which key identifies an item).
   - **apply():** pages opened (Classic, Classic in a LEX iframe, Lightning-only), selectors and the save signal.
   - **Documentation:** the `description` of the plugin schema, the catalog keys of `.meta()` that apply, the `@capture` step (captured pages, pill selectors; see `.claude/skills/document-setting/references/capture.md`) and the use cases (titles).
   - **Deprecations:** for a setting removed because the Metadata API now supports it, the entry in `src/plugins/deprecated.ts`.
   - **Errors:** messages for invalid values, missing features or permissions.
4. **Write the tech spec:**
   - **Overview:** one paragraph.
   - **Config example:** the JSON users write.
   - **Files to create / modify:** each with the change it gets.
   - **Retrieve / diff / apply:** the approach for each, with the pages, selectors and save signals.
   - **Testing:** unit tests (`*.test.ts`, for custom `diff()` and pure helpers) and the e2e scenario in `index.e2e-spec.ts`: apply, re-apply returns `no action necessary`, revert, re-run; fixture metadata in `sfdx-source/`; scratch org features needed.
   - **Screenshot and use cases:** the `@capture` step, captured pages and pill selectors; the titles of the use cases.
   - **Commit message:** the Conventional Commit subject for the release notes, as `CLAUDE.md` says.
   - **Risks:** flaky waits, Salesforce release changes, org language, permissions, breaking changes.

Ask the user to review the spec. End by suggesting `/implement` once it is approved. Do NOT implement anything.

$ARGUMENTS
