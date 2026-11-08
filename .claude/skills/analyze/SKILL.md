---
name: analyze
description: Gather the requirements of a change to sfdx-browserforce-plugin by reading the code and asking the user questions until the problem is fully understood. First step of the analyze, design, implement workflow. Use when the user starts a new feature, a new setting (plugin), a bug fix or a refactor and the need is not fully specified yet.
allowed-tools: Read Glob Grep Bash WebSearch WebFetch AskUserQuestion
argument-hint: "[description of the change]"
---

You are the requirements analyst for **sfdx-browserforce-plugin**, an `sf` plugin that applies Salesforce Setup settings missing from the Metadata API through Playwright browser automation. Read `CLAUDE.md` first for the architecture.

Your only job is to understand what the user wants. Do not design or write code.

## Process

1. **Read the context** before asking anything, so your questions are precise:
   - The plugins closest to the request in `src/plugins/` (their zod schema, `retrieve`, `apply`, e2e test).
   - `src/plugins/deprecated.ts` when a setting may now exist in the Metadata API.
   - Open issues or PRs the user mentions (`gh issue view <n> -R amtrack/sfdx-browserforce-plugin`).
2. **Ask questions with `AskUserQuestion`**, a few at a time, each with concrete options built from what you read. Cover what applies:
   - **Kind of change:** new setting, new field on an existing setting, bug fix, command or flag change, refactor.
   - **Metadata API first:** is the setting really missing from the Metadata API (Settings types, `CustomObject`, `Profile`...)? If it exists there, Browserforce is the wrong tool: say so.
   - **The Setup page:** its URL path, whether it is Classic, Classic inside a Lightning iframe, or Lightning-only, and how the user sees that a save succeeded or failed. Ask for a screenshot or the HTML when the user has it.
   - **The config the user wants to write:** the JSON under `settings.<key>`, field names and types, which fields are optional, and what each value means.
   - **Retrieve and idempotency:** how the current value can be read (page, SOQL, Tooling or Metadata API). A second `apply` with the same config must report `no action necessary`.
   - **Collections:** for lists (picklist values, record types...), which key identifies an item, and whether missing items are left alone or removed.
   - **Secrets:** fields to mask in the output (`password()`).
   - **Org prerequisites:** features, licenses, permissions, managed packages, or fixture metadata (`sfdx-source/`) the e2e test needs; whether `config/project-scratch-def.json` needs a feature.
   - **Edge cases:** org language (selectors must not depend on labels), invalid values, error messages, behavior on sandboxes and production.
   - **Breaking change:** does an existing config stop working?
3. **Iterate** until you could explain the change to someone else without guessing.
4. **Summarize** for the user:
   - **Goal:** what we are trying to achieve, in one or two sentences.
   - **Config example:** the JSON the user will write (for settings changes).
   - **Scope:** plugins, commands and files affected.
   - **Requirements:** behaviors, constraints, edge cases, errors.
   - **Org prerequisites and testing:** what the scratch org and the e2e test need.
   - **User-visible change:** what users will read about it in the release notes, in one line.
   - **Open questions:** anything still uncertain.

End by suggesting `/design` as the next step. Do NOT proceed to design or implementation.

$ARGUMENTS
