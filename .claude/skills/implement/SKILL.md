---
name: implement
description: >
  Implement a feature, a new setting (plugin), a bug fix or any code change in sfdx-browserforce-plugin, then verify
  it and finish with an automatic high-effort code review that applies its fixes. Use whenever the user asks to
  implement, add, fix or change something, with or without a prior /design.
allowed-tools: Read Glob Grep Write Edit Bash PowerShell Skill AskUserQuestion Agent
argument-hint: "[feature or change to implement]"
---

You are a developer on **sfdx-browserforce-plugin**. Read `CONTRIBUTING.md` ("Developing plugins") and `docs/PLAYWRIGHT.md` before writing code.

Run every step below without stopping to ask whether to continue. Ask the user only for a real decision, or before running e2e tests on an org that is not a scratch org.

## 1. Plan

If a `/design` spec exists in the conversation, follow it. Otherwise read the request, find the closest existing plugins with Glob/Grep, and form a short plan before editing. If the request is too vague to plan, suggest `/analyze` instead of guessing.

## 2. Implement

- **New setting:** scaffold it with `npm run generate:plugin -- --name <PascalCaseName>`, then replace the generated code.
- Schema, `.meta()` catalog keys, documentation `description`, `retrieve`/`apply`: as `CONTRIBUTING.md` describes. The default `diff()` is enough unless the setting holds a collection.
- Relative imports end in `.js` (ESM).
- The `@capture` step and `use-cases.md`: as the design says, following `.claude/skills/document-setting/references/`.
- After a schema or command change, run `npm run generate:docs` and keep the regenerated `docs/` and `mkdocs.yml`.
- A user-visible change to a command or flag also updates its `summary` / `description`; `npm run build` regenerates the README usage section.

## 3. Verify

Run `npm run build`, `npm run test`, `npm run format` and `npm run test:format` with the Bash tool. Fix every failure before going on. Add unit tests for custom `diff()` logic and pure helpers.

**E2E tests** change the default target org. Check it first with `sf org list --json`:

- If the default org (`isDefaultUsername: true`) is listed under `result.scratchOrgs`, run the plugin's tests: `npm run test:e2e -- -g "<PluginClassName>"`.
- Otherwise, or when there is no default org, do not run them: ask the user with `AskUserQuestion` whether to run them, create a scratch org with `npm run develop` (`CPQ=true` when the plugin needs Salesforce CPQ), or skip.
- When an e2e test fails on timing, fix the wait condition, not the timeout. A new plugin's e2e test should pass several runs in a row (see `CONTRIBUTING.md`); tell the user if you could not repeat it.

**Use cases and screenshots:** once the e2e tests pass on a scratch org (or when only the screenshots changed), run the project skill `/document-setting <configKey>` for each new or changed setting.

## 4. Code review with automatic fixes

When the implementation is complete and verified, run the built-in code review at high effort with fixes applied, by calling the Skill tool:

```
Skill(skill: "code-review", args: "high --fix")
```

Then:

- Re-run `npm run build`, `npm run test` and `npm run test:format` after the fixes, and fix what they break.
- Re-run the e2e tests of the plugin if a fix touched its `retrieve`, `diff` or `apply` and the e2e step ran earlier.
- If the review reports findings it did not fix, decide on each: fix it, or explain in the report why it is left.

## 5. Report

Summarize for the user: files changed, how the change was verified (unit, e2e on which org, or skipped and why), what the code review found and fixed, and the proposed commit message (Conventional Commit for the release notes, as `CLAUDE.md` says), e.g. `fix(salesforceCpqConfig): find the calculation service setting again`. Do not commit unless the user asked.

$ARGUMENTS
