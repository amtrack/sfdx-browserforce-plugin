# Plan — zod-schema-generation

> Source: design doc `docs/design/zod-schema-generation.md` · ADRs: none as separate files — the design doc's
> "Decision candidates" table (Accepted column, decided 2026-08-27) is the decision record.
> The plan is the implementation script AND the knowledge handoff. Part agents start
> with zero context: whatever a part block omits is paid later as agent rediscovery.

## Repo facts every part needs

- Working dir: `/Users/me/Projects/github.com/amtrack/sfdx-browserforce-plugin/.claude/worktrees/zod-schema-generation`. Work ONLY here.
- ESM (`"type": "module"`); relative imports carry a `.js` suffix even for `.ts` sources.
- `zod@^4.4.3` is already a runtime dependency. Import as `import { z } from 'zod';`.
- `tsconfig.json` has `rootDir: "src"`, `include: ["./src/**/*.ts"]`, `outDir: "lib"`.
  `scripts/*.ts` is deliberately outside that include and is run via ts-node, never compiled by `tsc -p .`.
- Gate command for every part: `npm run build && npm run test && npm run test:format`
  (`test` = `tsc -p test && nyc mocha "test/**/*.test.ts" "src/**/*.test.ts"`). No per-file narrowing exists.
- Formatting is `@salesforce/prettier-config` (single quotes, 120 print width, trailing commas) via
  `prettier.config.mjs`. Run `npm run format` before gating.
- Conventional commits. Never `git add` anything under `docs/`.

## Pinned zod v4.4.3 behaviour (empirically verified in this worktree — do NOT re-probe)

`z.toJSONSchema(schema, { target: 'draft-7', io: 'input' })` produces:

| Input | Output |
|---|---|
| root | `"$schema": "http://json-schema.org/draft-07/schema#"`, definitions bucket named `definitions` |
| `.meta({ id: 'X', title, description })` | hoisted into `definitions.X`, `title`/`description` kept |
| optional reference to a `.meta({id})` schema | `{ "allOf": [{ "$ref": "#/definitions/X" }] }` (always wrapped) |
| unknown meta keys (`x-password`, `if`, `then`, `else`, `oneOf`, `examples`, `$comment`, `default`) | pass through verbatim |
| `z.object({...})` + `io: 'input'` | no `additionalProperties: false`; keys with `.default()` dropped from `required` |
| `z.array(x).default([])` | `{ "default": [], "type": "array", "items": ... }`, key NOT in `required` |
| `z.array(x).meta({ default: [] })` | `{ "type": "array", "items": ..., "default": [] }`, key STAYS in `required` |
| `z.record(z.string().regex(/re/), v)` | `propertyNames: { type: 'string', pattern: 're' }` + `additionalProperties: v` (NOT `patternProperties`) |
| `z.string().nullable()` | `{ "anyOf": [{ "type": "string" }, { "type": "null" }] }` |
| `z.enum([...])` | `{ "type": "string", "enum": [...] }` |
| non-optional key at root object | listed in `required` |

Running a `scripts/*.ts` file works today with:
`node --loader ts-node/esm --no-warnings=ExperimentalWarning scripts/<file>.ts` (verified; no extra tsconfig needed).

## Accepted migration deltas (old hand-written JSON → generated JSON)

These are expected and must be enumerated, not fixed:

1. `$id` removed everywhere (today's `$id`s are inconsistent/copy-paste-wrong and unused).
2. `patternProperties` (auth-providers) → `propertyNames` + `additionalProperties`.
3. Cross-file `$ref`s (`"./x/schema.json"`) → `#/definitions/*`; optional ones wrapped in `allOf`.
4. Root aggregate gains `"required": ["settings"]` and `"type": "object"` on `settings`.
5. `type: ["string","null"]` (picklists/field-dependencies `controllingField`) → `anyOf` of the two.
6. Arrays declared without `items` gain `items` (intentional tightening of the JSON Schema only):
   `permission-sets/service-presence-status` → `items: { type: 'string' }`;
   `service-channels/capacity.valuesForInProgress` → `items: { type: 'string' }`.
7. `reportsAndDashboards` and `linkedInSalesNavigatorSettings` newly appear under `settings`
   (they were missing from the hand-maintained aggregate — this is a bug fix by construction).
8. Definitions are hoisted into one flat root `definitions` bucket instead of per-file `definitions` blocks;
   inline anonymous definitions get stable ids (see the naming rule in Part 3/Part 4 context).

Everything else — every `title`, `description`, `enum`, `default`, `required`, `examples`, `$comment`,
`oneOf`, `if`/`then`/`else`, `x-password: true` — MUST survive byte-equal in value.

## Decision candidates

The design's 8 load-bearing choices are all already decided (see its Accepted column) and are NOT re-opened here.
Three choices the design does not cover surfaced while pre-chewing. They are recorded for the user, with a
recommendation; the parts below are written assuming the recommendation, and a different ruling only changes the
named lines.

| # | Choice | Alternatives | Recommendation |
|---|---|---|---|
| A | `service-channels/capacity`'s `if`/`then`/`else` conditional, which zod cannot express as a validator | (a) keep it as JSON-Schema-only metadata via `.meta({ if, then, else })` passthrough — editors keep the hint, zod runtime does not enforce it; (b) drop it entirely; (c) model as `z.discriminatedUnion` → changes the emitted shape to `anyOf` | **(a)** — preserves the generated file (requirement 5), never tightens runtime validation |
| B | `security/authentication-configuration`'s `oneOf` required-combination block, likewise inexpressible | (a) `.meta({ oneOf: [...] })` passthrough; (b) drop, keeping only `required: ['enabled']` on the item; (c) `z.union` of three object shapes → emits `anyOf` | **(a)** — same reasoning as A |
| C | Internal, non-user-facing fields on plugin Config types (`_id`, `_newValueId`) that must not appear in the schema, and `salesforce-cpq-config`'s `export type Config = any` | (a) `export type Config = z.infer<typeof schema>` intersected with a local `{ _id?: string }` type where needed; (b) add the `_` fields to the zod schema (leaks into the public JSON Schema); (c) leave those plugins' Config hand-written | **(a)** — keeps the public schema clean and still satisfies requirement 7 for every user-facing field |

## Sizing rules

- Every part costs a full agent lifecycle — it must earn it. No standalone test-only parts for feature code.
  Parts 8 (scaffolding + docs) is tooling/prose only with no `src/` behaviour delta and is legitimately standalone.
- Parts are sequential and share one working tree; each builds on the previous.

## Part 1 — Masking foundation: `password()` helper and schema traversal

### Context

Two files, no plugin conversion yet. This part lands ahead of the conversion so later parts can use `password()`
and so `apply.ts` (Part 6) has a traversal that already understands zod-shaped output.

**`src/plugins/utils.ts`** — current contents relevant here:

- `function extractPasswordFields(schema: unknown, prefix = ''): Set<string>` (module-private, starts around
  line 54). Today it handles exactly three things: a node with `schemaObj['x-password'] === true` (adds `prefix`),
  `schemaObj.patternProperties` (recurses each value with the SAME prefix), and `schemaObj.properties`
  (recurses each value with `prefix ? \`${prefix}.${key}\` : key`).
- `function isPasswordField(fieldPath, passwordFields): boolean` — exact match, or `fieldPath` ends with
  `.${passwordField}`. Unchanged by this part.
- `export function maskSensitiveValues(value: unknown, keyPath = '', schema?: unknown): unknown` — signature
  MUST stay exactly as is (it stays JSON-Schema-shaped, per the design). It calls
  `schema ? extractPasswordFields(schema) : new Set<string>()` and otherwise falls back to a regex list
  (`/secret/i`, `/password/i`, `/token/i`, `/key/i`, `/credential/i`, `/auth/i`, …).

**What to add to `extractPasswordFields`:**

1. `additionalProperties` in object form — recurse with the SAME prefix (mirrors today's `patternProperties`
   handling), because `z.record(...)` emits `additionalProperties: <valueSchema>`. Ignore the boolean form.
2. `$ref` of the form `#/definitions/<name>` — resolve against the ROOT schema document and recurse into the
   target with the current prefix. This needs the root passed down: give the function a third parameter
   `root: unknown = schema` (defaulted on the outermost call) rather than a module-level variable.
   Guard against `$ref` cycles with a `Set<string>` of already-visited ref pointers threaded through.
3. `allOf` (array) — recurse each member with the same prefix, since optional refs are wrapped
   (`{"allOf": [{"$ref": "#/definitions/X"}]}`).
4. Keep `patternProperties` handling — harmless, and existing tests may lean on it.

**New export in the same file** (decision 8, accepted variant (b) — a typed helper, not a magic string):

```ts
import { z } from 'zod';
export function password<T extends z.ZodType>(schema: T): T { … }
```

It must return a schema with `'x-password': true` merged into its metadata while preserving any metadata the
caller already set, so `password(z.string().meta({ title: 'Consumer Secret', description: '…' }))` emits all
three keys. Implement it as `schema.meta({ ...schema.meta(), 'x-password': true })` and keep the return type
assignable to `T` so `.optional()` still chains. Verify the emitted key ordering does not matter — it does not,
the equivalence check in Part 5 compares parsed JSON, not bytes.

**Tests — `test/utils.test.ts`.** The file today only has `describe('semanticallyCleanObject', …)` (line 4) and
`describe('isEmptyObjectOrArray', …)` (line 25) — there is NO existing `maskSensitiveValues` describe block, so
add one. It imports from `'../src/plugins/utils.js'`. Use plain `assert` (node `assert`), matching the file's style.

### TDD steps

RED

1. `test/utils.test.ts`, new `describe('maskSensitiveValues')`: given the zod-shaped auth-providers schema
   (root object with `propertyNames.pattern` and `additionalProperties: { properties: { consumerSecret: { 'x-password': true, type: 'string' }, consumerKey: { type: 'string' } } }`) and a value
   `{ myProvider: { consumerSecret: 's3cret', consumerKey: 'ck' } }`, assert `consumerSecret` becomes `'****'`
   and `consumerKey` stays `'ck'`.
   Fails: `extractPasswordFields` never descends into `additionalProperties`, so `consumerSecret` is only caught
   by the `/secret/i` fallback — and `consumerKey` is wrongly masked by the `/key/i` fallback, so the second
   assertion fails.
2. Same describe: a root document `{ definitions: { provider: { properties: { consumerSecret: { 'x-password': true } } } }, additionalProperties: { $ref: '#/definitions/provider' } }` masks `consumerSecret` at a nested path.
   Fails: `$ref` is not followed.
3. Same describe: an `allOf`-wrapped optional ref
   (`{ properties: { security: { allOf: [{ $ref: '#/definitions/security' }] } }, definitions: { … } }`)
   reaches a nested `x-password` field at path `security.certificates.password`.
   Fails: `allOf` is not walked.
4. Same describe: `maskSensitiveValues({ consumerSecret: 'x' })` with NO schema argument still masks via the
   regex fallback (pins the existing behaviour so the traversal change cannot regress it). Should pass already —
   keep it as a guard.
5. New `describe('password')`: `z.toJSONSchema(z.object({ s: password(z.string().meta({ title: 'T' })) }), { target: 'draft-7', io: 'input' })` yields
   `properties.s = { type: 'string', title: 'T', 'x-password': true }`.
   Fails: `password` does not exist (import error).
6. `describe('password')`: a `$ref` cycle (`definitions.a.properties.b.$ref = '#/definitions/a'`) fed to
   `maskSensitiveValues` terminates rather than recursing forever.
   Fails: no cycle guard.

GREEN — extend `extractPasswordFields` with the `root` + `visited` parameters and the `additionalProperties`,
`$ref`, `allOf` branches; add the `password` export.

REFACTOR — factor the "recurse and merge into the result set" repetition into one local helper; keep
`extractPasswordFields` module-private and `maskSensitiveValues`'s public signature untouched.

### Gate

```
npm run build && npm run test && npm run test:format
```

### Commit

`feat(plugins): add password() schema helper and follow refs when extracting password fields`

## Part 2 — Convert the 12 flat leaf plugins to `schema.ts`

### Context

Twelve plugins whose current `schema.json` is a single flat object with no `definitions`, no `$ref`, no
sub-directory schema. For each, create `src/plugins/<dir>/schema.ts` next to `index.ts` and delete NOTHING yet
(the `.json` files are deleted in Part 5, after the equivalence check).

Directories, and the exact `.meta({ id })` to use (id = the camelCase settings key, which is also the driver
export name in `src/plugins/index.ts`):

| directory | meta id | shape (all fields optional unless noted) |
|---|---|---|
| `activity-settings` | `activitySettings` | `allowUsersToRelateMultipleContactsToTasksAndEvents: boolean` |
| `company-information` | `companyInformation` | `defaultCurrencyIsoCode: string`; schema-level `description: ''` (empty string — keep it) |
| `density-settings` | `densitySettings` | `density: enum ['Comfy','Compact']` |
| `email-deliverability` | `emailDeliverability` | `accessLevel: enum ['No access','System email only','All email']` |
| `high-velocity-sales-settings` | `highVelocitySalesSettings` | `setUpAndEnable: boolean` |
| `lightning-experience-settings` | `lightningExperienceSettings` | `activeThemeName: string` |
| `linkedin-sales-navigator-settings` | `linkedInSalesNavigatorSettings` | `enabled: boolean` — note the id is `linkedInSalesNavigatorSettings` (capital I), matching the export in `src/plugins/index.ts`, while the directory is `linkedin-…` |
| `omni-channel-settings` | `omniChannelSettings` | `enableStatusBasedCapacityModel: boolean` |
| `opportunity-splits` | `opportunitySplits` | `enabled: boolean` |
| `relate-contact-to-multiple-accounts` | `relateContactToMultipleAccounts` | `enabled: boolean` |
| `salesforce-to-salesforce` | `salesforceToSalesforce` | `enabled: boolean` |
| `slack` | `slack` | `agreeToTermsAndConditions: boolean`, `enableSalesCloudForSlack: boolean` |

The `title` and `description` on the schema itself and on every property come VERBATIM from the existing
`src/plugins/<dir>/schema.json` — open each file and copy the strings exactly, including the long
`activity-settings` description with its URL and the `high-velocity-sales-settings` description containing a
literal `\n`. Do not reword, do not fix typos (e.g. slack's `"Agree to Termns and Conditions"` stays).

Canonical file shape:

```ts
import { z } from 'zod';

export const schema = z
  .object({
    enabled: z
      .boolean()
      .meta({ title: 'Enable Opportunity Splits', description: "Prerequisite: …" })
      .optional(),
  })
  .meta({ id: 'opportunitySplits', title: 'OpportunitySplits Settings' });
```

Rules:

- Every property is `.optional()` unless the source `schema.json` lists it in `required` (none of these twelve do).
- `title`/`description` go on the property via `.meta({...})`; omit the key entirely when the source has none.
- The schema-level `.meta()` carries `id`, then `title`, then `description` (only when the source has one).

**`index.ts` for each** — replace the hand-written `type Config = {...}` with:

```ts
import { schema } from './schema.js';
export type Config = z.infer<typeof schema>;
```

Caveats found while pre-chewing, per plugin:

- Most of these declare `type Config` **unexported** (`activity-settings`, `density-settings`,
  `email-deliverability`, `lightning-experience-settings`, `omni-channel-settings`, `opportunity-splits`,
  `relate-contact-to-multiple-accounts`, `salesforce-to-salesforce`, `customer-portal`, …). Export them now
  (`export type Config = …`) — harmless and consistent.
- `density-settings/index.ts` has a local `type Density = 'Comfy' | 'Compact'` used by the Config; it becomes
  redundant — delete it if nothing else references it, otherwise redefine it as `z.infer<typeof schema>['density']`.
- Because every property is now optional, `retrieve`/`apply` bodies that assumed a required field may fail
  `strict` compilation (e.g. `company-information/index.ts` builds `const response: Config = { defaultCurrencyIsoCode: '' }` — still fine; `slack/index.ts` builds both booleans — still fine).
  If a body genuinely breaks, narrow at the use site (`config.enabled ?? false`); do NOT make the schema field
  required, that would change the generated JSON Schema.
- `email-deliverability/index.ts` and `density-settings/index.ts` map the enum string to internal values; leave
  that logic alone.

### TDD steps

RED

1. Add `src/plugins/schema.test.ts` with a single `describe('plugin schemas')` and a first test:
   for each of the twelve, `import { schema } from './<dir>/schema.js'` and assert
   `z.toJSONSchema(schema, { target: 'draft-7', io: 'input' })` deep-equals the corresponding
   `src/plugins/<dir>/schema.json` **with `$schema` and `$id` stripped and the `.meta` id-hoisting undone**
   (convert with `z.toJSONSchema(schema.meta({ ...schema.meta(), id: undefined }), …)`, or simpler: convert a
   throwaway `z.object({ x: schema })` and read `definitions.<id>`). Read the `.json` files with
   `readFileSync(new URL('./<dir>/schema.json', import.meta.url), 'utf8')`.
   Fails: no `schema.ts` files exist yet (import error).
   This test is TEMPORARY — Part 5 deletes it together with the `.json` files and replaces it with the
   permanent parity/on-disk assertions.
2. `npm run build` type-checks `index.ts` against the new `Config` types (this is the RED for the `z.infer`
   change — a mismatch surfaces as a `tsc` error, not a mocha failure).

GREEN — write the twelve `schema.ts` files and switch the twelve `Config` types.

REFACTOR — extract the "convert one plugin schema and strip the wrapper" helper in `schema.test.ts` into a
local function used by all twelve cases; keep property ordering in each `schema.ts` identical to the source JSON
so the Part 5 diff stays readable.

### Gate

```
npm run build && npm run test && npm run test:format
```

### Commit

`refactor(plugins): define flat plugin schemas in zod`

## Part 3 — Convert the array-rooted and inline-definition plugins

### Context

Seven plugins whose `schema.json` has a root array and/or an inline `definitions` block. Same file convention as
Part 2 (`src/plugins/<dir>/schema.ts`, `.json` untouched until Part 5) and the same "copy every string verbatim"
rule. Extend the temporary `src/plugins/schema.test.ts` equivalence table from Part 2 with these.

**Inline-definition naming rule (load-bearing).** Every inline `definitions.<name>` in the source becomes its own
exported const in the same `schema.ts` with `.meta({ id: '<name>' })`, using the SAME name as today so the
generated flat `definitions` bucket keeps recognisable keys. Two source files both name their inline definition
`action` (`picklists` and `record-types`) — they would collide in one flat bucket. Rename to
`picklistAction` and `recordTypeAction` respectively and record it as an additional accepted delta in Part 5.
Check for any other collision by grepping the definition names before writing.

Per plugin:

- **`history-tracking`** — root is `type: array`, `items: $ref '#/definitions/historyTracking'`, `default: []`,
  title + description at root. Two definitions: `historyTracking` (`objectApiName` required; `enableHistoryTracking`;
  `fieldHistoryTracking` array of `fieldHistory` with `default: []`) and `fieldHistory`
  (`fieldApiName`, `enableHistoryTracking` both required).
  `export const schema = z.array(historyTrackingSchema).default([]).meta({ id: 'historyTracking', title: 'History Tracking', description: '…' })`.
  `index.ts` currently has `type HistoryTrackingConfig` and `export type FieldHistoryTrackingConfig` (line ~16) —
  redefine both from `z.infer`, keeping `FieldHistoryTrackingConfig` exported (other files import it — grep first).
- **`list-view-custom-buttons`** — root array + `default: []`, one definition `listViewCustomButtons`
  (`objectApiName`, `buttons` both required; `buttons` is `z.array(z.string().meta({ description: '…' })).meta({ default: [] })`
  — the `.meta({ default })` form, NOT `.default([])`, because the key must stay in `required`;
  `removeOtherButtons` is `z.boolean().meta({ default: false })` and is NOT in `required` today, so use
  `.optional().meta({ title, description, default: false })`).
  `index.ts` has `type ListViewCustomButtonsConfig` (~line 15).
- **`record-types`** — object with `deletions: array of recordTypeAction, default: []`; definition has
  `fullName` required, `replacement` optional. `index.ts` has `type Config` (~5) and `type RecordTypeConfig` (~9)
  plus an unrelated `type RecordType` (~75) — leave that one alone.
- **`picklists`** — object with `picklistValues: array of picklistAction, default: []` and `fieldDependencies`
  referencing the sub-directory schema (see the next bullet). `picklistAction` requires
  `['metadataType','metadataFullName']`; `metadataType` is `z.enum(['CustomField','GlobalValueSet','StandardValueSet'])`.
  **`index.ts` caveat (decision C):** `type PicklistValuesConfig` carries an internal `_newValueId?: string`
  that must NOT enter the schema — write
  `type PicklistValuesConfig = z.infer<typeof picklistActionSchema> & { _newValueId?: string };`
  and `export type Config = z.infer<typeof schema>` for the outer type.
- **`picklists/field-dependencies`** — its own `src/plugins/picklists/field-dependencies/schema.ts`.
  Root array of `fieldDependency`, `default: []`, root title + description. `fieldDependency` properties carry
  `examples` arrays (`.meta({ title, examples: ['Account','Vehicle__c','ACME__Vehicle__c'] })` — passthrough,
  verified) and `controllingField` is `z.string().nullable().optional()` with
  `.meta({ title, description, examples: ['Transmission__c','ACME__Transmission__c', null] })`.
  Expect the `anyOf` delta (delta 5). `picklists/schema.ts` imports it as
  `import { schema as fieldDependenciesSchema } from './field-dependencies/schema.js';` and uses
  `fieldDependencies: fieldDependenciesSchema.optional()` → emits the `allOf`-wrapped `$ref`.
- **`home-page-layouts`** — object with `homePageLayoutAssignments: array of homePageLayoutAssignment, default: []`;
  definition requires `['profile','layout']`. `index.ts` has `type Config` (~18) and
  `type HomePageLayoutAssignment` (~22).
- **`user-access-policies`** — object with `accessPolicies: array of accessPolicy, default: []`; definition
  requires `['apiName','active']`, `on` is `z.enum(['Create','Update','CreateAndUpdate'])`. `index.ts` has
  `export type Config` (~14) referencing `AccessPolicy`.
- **`customer-portal`** — object with `enabled: boolean`, `portals: array of portal, default: []`,
  `availableCustomObjects: array of availableCustomObject, default: []`. Three definitions: `portal`
  (`name` required; `portalProfileMemberships` array of `portalProfileMembership` with `description` + `default: []`),
  `portalProfileMembership`, `availableCustomObject` (`name`, `available` required).
  **Sub-plugin index files (decision C):** `src/plugins/customer-portal/portals/index.ts` has
  `export type Config = PortalConfig[]` where `PortalConfig` has `_id?: string` and `PortalProfileMembership` has
  `_id?: string`; `src/plugins/customer-portal/available-custom-objects/index.ts` has
  `AvailableCustomObjectConfig` with `_id?: string`. Derive each from the matching definition const exported by
  `customer-portal/schema.ts` and intersect the `_id` field:
  `export type Config = (z.infer<typeof portalSchema> & { _id?: string })[];`.
  `customer-portal/enabled/index.ts` has `export type Config = boolean | undefined` — leave it exactly as is,
  it is not a schema-backed shape.
  `customer-portal/index.ts` composes `CustomerPortalEnableConfig` / `CustomerPortalSetupConfig` — re-point its
  `type Config` at `z.infer<typeof schema>` and fix any resulting mismatch at the use site.

### TDD steps

RED

1. Extend the `src/plugins/schema.test.ts` equivalence table with the seven plugins plus
   `picklists/field-dependencies`, comparing conversion output against the corresponding `schema.json` modulo the
   accepted deltas (the helper from Part 2 must now also normalise: `$ref` pointer rewrites, `anyOf`-for-nullable,
   the `action` → `picklistAction`/`recordTypeAction` rename, and the flattened `definitions` bucket).
   Fails: the `schema.ts` files do not exist.
2. A dedicated test in the same file: `historyTrackingSchema` with `.default([])` produces `default: []` at the
   root of the converted array schema, while `listViewCustomButtons.buttons` (using `.meta({ default: [] })`)
   still appears in the item's `required`.
   Fails: nothing to import yet — and it is the specific trap that separates the two default idioms.
3. `npm run build` type-checks the reworked `Config`/`_id` intersections.

GREEN — write the eight `schema.ts` files and rework the `Config` types.

REFACTOR — where two definitions in one file share a property block, hoist it to a shared const; keep the
`.meta({ id })` names stable.

### Gate

```
npm run build && npm run test && npm run test:format
```

### Commit

`refactor(plugins): define array and nested-definition plugin schemas in zod`

## Part 4 — Convert the directory-sub-schema and special-case plugins

### Context

The remaining eight schema files, including every case the design flags as load-bearing. Same conventions as
Parts 2–3; `.json` files still untouched. Extend the temporary `src/plugins/schema.test.ts` table again.

- **`auth-providers`** (the `x-password` case). Today: root object with
  `patternProperties: { "^[a-zA-Z0-9_]+$": { type: object, properties: { consumerSecret (x-password: true), consumerKey } } }`.
  Write:
  ```ts
  const authProviderSchema = z.object({
    consumerSecret: password(z.string().meta({ title: 'Consumer Secret', description: '…' })).optional(),
    consumerKey: z.string().meta({ title: 'Consumer Key', description: '…' }).optional(),
  });
  export const schema = z
    .record(z.string().regex(/^[a-zA-Z0-9_]+$/), authProviderSchema)
    .meta({ id: 'authProviders', title: 'Auth Providers', description: 'Configuration for updating Auth Provider Consumer Key and Consumer Secret' });
  ```
  `password` is imported from `../utils.js` (Part 1). Emits `propertyNames` + `additionalProperties` (delta 2) —
  this is exactly the shape Part 1's traversal was taught to follow.
  `index.ts` has `export type Config = { [developerName: string]: AuthProviderConfig }` (line 15) → `z.infer`.
  Do NOT give `authProviderSchema` its own `.meta({ id })`; it has no name in the source and does not need one.
- **`security`** — object with `certificateAndKeyManagement` and `authenticationConfiguration`, each a
  directory sub-schema. Root `.meta({ id: 'security', title: 'Security Controls' })`, both properties
  `.optional()` (→ `allOf`-wrapped refs). `index.ts` has `type Config` (~11) composing the two sub-configs.
- **`security/certificate-and-key-management`** — own `schema.ts`. Object with `certificates` (array of
  `certificate`, `default: []`) and `importFromKeystore` (array of `keystore`, `default: []`).
  `certificate` requires `['name','label']`, `keysize` is `z.number().int()` (source says `type: integer`;
  verify zod emits `type: 'integer'` for `.int()` and adjust if it emits `type: 'number'` + `multipleOf`).
  `keystore` requires `['name','filePath']` and has a plain `password: z.string().optional()` — do NOT wrap it in
  `password()`; the source has no `x-password` there and adding one would change the generated output. Masking
  still catches it via the `/password/i` fallback.
- **`security/authentication-configuration`** — own `schema.ts`. Root object with `services` REQUIRED
  (source has top-level `"required": ["services"]`) and `default: []`. Because `io: 'input'` drops
  `.default()`ed keys from `required`, write `services: z.array(serviceSchema).meta({ description: '…', default: [] })`
  — the `.meta({ default })` form (verified: keeps `required: ['services']`). The item object has `label`,
  `authProviderApiName` optional and `enabled` required, plus the `oneOf` block carried as
  `.meta({ oneOf: [{ required: ['label','enabled'] }, { required: ['authProviderApiName','enabled'] }, { required: ['label','authProviderApiName','enabled'] }] })`
  (decision candidate B, recommendation (a); passthrough verified).
  `index.ts` has `export type Config` (line 8).
- **`service-channels`** — root array of `serviceChannel`, `default: []`. `serviceChannel` requires
  `['serviceChannelDeveloperName']` and has `capacity` referencing the sub-directory schema (`.optional()`).
  `index.ts` has `type ServiceChannel` (~4) and imports `CapacityConfig` from `./capacity/index.js`.
- **`service-channels/capacity`** — own `schema.ts`. All five properties optional
  (`capacityModel` is `z.enum(['TabBased','StatusBased'])`; `valuesForInProgress` is `z.array(z.string())` —
  delta 6, the source has no `items`). The `if`/`then`/`else` block is carried on the schema-level meta
  (decision candidate A, recommendation (a); passthrough verified):
  `.meta({ id: 'capacity', title: 'Capacity Settings', if: { properties: { capacityModel: { const: 'Status-based' } } }, then: { required: ['statusField','valuesForInProgress'] }, else: { not: { required: ['statusField','valuesForInProgress'] } } })`.
  Copy the `'Status-based'` const verbatim even though it does not match either enum value — that mismatch exists
  today and fixing it is out of scope.
- **`permission-sets`** — root array of `permissionSet`, `default: []`; `permissionSet` requires
  `['permissionSetName']` and has `servicePresenceStatuses` referencing the sub-directory schema.
- **`permission-sets/service-presence-status`** — own `schema.ts`. Source is bare `type: array, default: []`
  with no `items`; `index.ts`'s `retrieve` returns `Promise<string[]>`, so write
  `z.array(z.string()).default([]).meta({ id: 'servicePresenceStatuses', title: 'Service Presence Statuses' })`
  (delta 6). Note `index.ts` here declares a local `type PermissionSet` (line ~10) and does NOT export `Config`;
  leave its structure alone beyond deriving the element type.
- **`reports-and-dashboards`** — object with one property `folderSharing` referencing the sub-directory schema
  (`.optional()`). `index.ts` has `type Config` (~4).
- **`reports-and-dashboards/folder-sharing`** — own `schema.ts`. One boolean property
  `enableEnhancedFolderSharing` carrying `title` AND a `$comment` — pass the `$comment` through
  `.meta({ title: '…', $comment: 'If your organization was created after the Summer '13 Salesforce release, you already have enhanced folder sharing' })`
  (note the typographic apostrophe `’` in the source — copy it verbatim).
  `index.ts` has `export type Config` (line 9).
- **`salesforce-cpq-config`** — the largest file: nine sibling object properties (`documents`, `groups`,
  `lineEditor`, `plugins`, `pricingAndCalculation`, `subscriptionsAndRenewals`, `quote`, `order`,
  `additionalSettings`), each with a `title` and a flat bag of `string`/`boolean`/`number` properties each
  carrying only a `title`. All optional at every level; no `definitions`, no `required`.
  Do NOT give the nine nested objects `.meta({ id })` — they are inline in the source and must stay inline.
  **`index.ts` caveat (decision C):** it currently declares `export type Config = any` (line 14) and the body
  indexes it dynamically (`definition[keyTab][keyItem]`, `response[keyTab] = …`). Write
  `export type Config = z.infer<typeof schema> & { [key: string]: any };` so the dynamic indexing keeps
  compiling. If `tsc` still objects, raise a blocker rather than reintroducing a suppression directive.

### TDD steps

RED

1. Extend the temporary equivalence table in `src/plugins/schema.test.ts` with all eight files, normalising the
   accepted deltas (`patternProperties` → `propertyNames`/`additionalProperties`, cross-file `$ref` →
   `#/definitions/*`, missing-`items` → `items`).
   Fails: the `schema.ts` files do not exist.
2. In `src/plugins/schema.test.ts`, assert the auth-providers conversion carries `x-password: true` at
   `additionalProperties.properties.consumerSecret` — the exact node Part 1's traversal targets.
   Fails: `auth-providers/schema.ts` does not exist.
3. In `src/plugins/schema.test.ts`, assert `authenticationConfiguration` conversion still lists
   `required: ['services']` while carrying `default: []` — the `.meta({ default })` vs `.default()` trap.
   Fails: same.
4. In `test/utils.test.ts`, add an end-to-end masking case that feeds the REAL converted auth-providers schema
   (imported from `src/plugins/auth-providers/schema.js` and converted with
   `z.toJSONSchema(…, { target: 'draft-7', io: 'input' })`) into `maskSensitiveValues` and asserts
   `consumerSecret` is masked and `consumerKey` is not.
   Fails: schema does not exist yet. This is the test that proves Part 1 + Part 4 fit together.
5. `npm run build` type-checks the reworked `Config` types, including `salesforce-cpq-config`.

GREEN — write the eight `schema.ts` files and rework the `Config` types.

REFACTOR — in `salesforce-cpq-config/schema.ts`, factor the repeated `z.string().meta({ title })` /
`z.boolean().meta({ title })` idiom into two tiny local helpers (`str('Document Folder')`,
`bool('Hide Document Name')`) to keep the file readable; the emitted JSON must be unchanged.

### Gate

```
npm run build && npm run test && npm run test:format
```

### Commit

`refactor(plugins): define nested and special-case plugin schemas in zod`

## Part 5 — Aggregate, generator, and deletion of the JSON schema files

### Context

Every plugin now has a `schema.ts`. This part wires them into one root schema, generates
`src/plugins/schema.json` from it, proves equivalence against the old hand-written files, then deletes them.

**`src/plugins/index.ts`** — today it imports 25 drivers (`import { ActivitySettings as activitySettings } from './activity-settings/index.js';` …) and re-exports them in one alphabetical `export { … }` block (the
`linkedInSalesNavigatorSettings` entry sits between `listViewCustomButtons` and `omniChannelSettings` in the
export block — keep that existing ordering quirk). Add, below the driver block:

```ts
import { z } from 'zod';
import { schema as activitySettingsSchema } from './activity-settings/schema.js';
// … one per plugin, same order as the driver imports

const drivers = {
  activitySettings,
  authProviders,
  // … all 25, mirroring the existing export block
} as const;

export const schemas: Record<keyof typeof drivers, z.ZodType> = {
  activitySettings: activitySettingsSchema,
  // … one per plugin
};
```

The design requires that a key present in `schemas` but not in the driver exports (or vice versa) be a **type
error**. The annotation above delivers both directions: a missing key is "property … is missing", an extra key
is an excess-property error on the object literal. Keep the existing `export { … }` block exactly as it is and
add `drivers` as a local `as const` mirror of it — that duplication is the price of the type-level contract and
is itself guarded, because a driver added to `export { … }` but not to `drivers` leaves `schemas` under-typed
and the parity unit test below catches it.
The 25 keys are: activitySettings, authProviders, companyInformation, customerPortal, densitySettings,
emailDeliverability, highVelocitySalesSettings, historyTracking, homePageLayouts, lightningExperienceSettings,
listViewCustomButtons, linkedInSalesNavigatorSettings, omniChannelSettings, opportunitySplits, permissionSets,
picklists, recordTypes, relateContactToMultipleAccounts, reportsAndDashboards, salesforceCpqConfig,
salesforceToSalesforce, security, serviceChannels, slack, userAccessPolicies.

**New `src/plugins/schema.ts`** (root, distinct from every per-plugin `schema.ts`):

```ts
import { z } from 'zod';
import { schemas } from './index.js';

export const rootSchema = z
  .object({
    settings: z.object(Object.fromEntries(Object.entries(schemas).map(([key, s]) => [key, s.optional()]))),
  })
  .meta({
    title: 'Browserforce Configuration',
    description:
      'The browserforce config file contains the configuration values that defines browser automation tasks for Salesforce orgs.',
  });
```

(title/description copied verbatim from today's `src/plugins/schema.json`.) Watch the import cycle:
`index.ts` must NOT import `./schema.js`. Part 6 and 7 import `schemas` from `./index.js` and `rootSchema` from
`./schema.js` respectively.

**New `scripts/generate-schema.ts`**, run as
`node --loader ts-node/esm --no-warnings=ExperimentalWarning scripts/generate-schema.ts` (verified working;
`scripts/` stays outside `tsconfig.json`'s `include`):

```ts
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import { z } from 'zod';
import { rootSchema } from '../src/plugins/schema.js';

const target = new URL('../src/plugins/schema.json', import.meta.url);
const json = JSON.stringify(z.toJSONSchema(rootSchema, { target: 'draft-7', io: 'input' }), null, 2);
const config = await prettier.resolveConfig(fileURLToPath(target));
writeFileSync(target, await prettier.format(json, { ...config, filepath: 'schema.json' }));
```

All-or-nothing: no try/catch, no partial write — an import failure exits non-zero naturally. `prettier` is
already a devDependency (3.9.6) and `prettier.config.mjs` re-exports `@salesforce/prettier-config`.

**`package.json`**: add `"generate:schema": "node --loader ts-node/esm --no-warnings=ExperimentalWarning scripts/generate-schema.ts"`
and change `"build"` from `"rm -rf lib && tsc -p . && oclif manifest && oclif readme"` to
`"npm run generate:schema && rm -rf lib && tsc -p . && oclif manifest && oclif readme"`.
`prepack`/`prepare` already call `build`, so they inherit it.

**`.github/workflows/default.yml`** — in the `test` job, immediately after the `Check formatting` step
(`run: npm run test:format`), insert:

```yaml
      - name: Check generated schema is up to date
        run: npm run generate:schema && git diff --exit-code src/plugins/schema.json
```

**Golden-file equivalence check (one-off, NOT committed).** Before deleting anything, write a throwaway script
under the scratchpad directory (never in the worktree) that: (a) loads today's `src/plugins/schema.json` and
fully dereferences every relative `$ref` by reading the referenced file from disk and inlining it (recursively,
including nested `./x/schema.json` refs and intra-file `#/definitions/*`); (b) loads the newly generated
`src/plugins/schema.json` and dereferences its `#/definitions/*`; (c) deep-compares the two and prints every
difference. Then confirm by hand that every reported difference is one of the accepted deltas 1–8 listed at the
top of this plan plus the `action` → `picklistAction`/`recordTypeAction` rename from Part 3. Record the final
delta list in the commit body. Any difference that is NOT on the list is a conversion bug — fix the `schema.ts`,
do not extend the list without saying so explicitly in the commit body.

**Deletion.** `git rm` all 32 `schema.json` files under `src/plugins/**` — the 31 per-plugin/sub-schema files
plus `src/plugins/schema.json` — then let `npm run generate:schema` recreate `src/plugins/schema.json` and
`git add` it. The 63 non-schema fixture files under `src/plugins/**` (`enable.json`, `disable.json`,
`currency-zar.json`, …) keep their `"$schema": "../schema.json"` / `"../../schema.json"` pointers unchanged —
those relative paths still resolve to the (now generated) aggregate, which is the point of requirement 3.
Note that fixtures in sub-directories (e.g. `src/plugins/picklists/field-dependencies/set.json`) point two levels
up; verify with a grep that no fixture points at a per-plugin `schema.json` that is being deleted, and if one
does, repoint it at the aggregate.

**`src/plugins/schema.test.ts`** — delete the temporary equivalence table built in Parts 2–4 (its inputs no
longer exist) and replace it with the two permanent assertions from the design:

1. `Object.keys(schemas)` and the driver export keys are the same set (both directions).
2. The `src/plugins/schema.json` on disk, parsed, deep-equals `z.toJSONSchema(rootSchema, { target: 'draft-7', io: 'input' })` — the same assertion CI makes, so a stale commit fails locally too.
   Read it with `readFileSync(new URL('./schema.json', import.meta.url), 'utf8')`.

Also assert `settings.properties` has exactly 25 keys including `reportsAndDashboards` and
`linkedInSalesNavigatorSettings` (delta 7 — the drift this change fixes).

### TDD steps

RED

1. Rewrite `src/plugins/schema.test.ts`: parity test between `schemas` and the driver exports.
   Fails: `schemas` is not exported from `src/plugins/index.ts`.
2. Same file: on-disk `src/plugins/schema.json` deep-equals `z.toJSONSchema(rootSchema, …)`.
   Fails: `rootSchema` does not exist, and the on-disk file is still the hand-written aggregate.
3. Same file: `settings.properties` contains `reportsAndDashboards` and `linkedInSalesNavigatorSettings`.
   Fails: today's aggregate omits both.
4. Deliberately remove one key from the `schemas` literal and confirm `npm run build` fails with a `tsc` error,
   then restore it (a manual RED for the type-level contract — do not commit the broken state).

GREEN — add `schemas` to `index.ts`, add `src/plugins/schema.ts`, add `scripts/generate-schema.ts`, wire
`generate:schema` and `build` in `package.json`, add the CI step, run the generator, run the equivalence check,
delete the 32 `.json` files, commit the regenerated aggregate.

REFACTOR — if the generator grows past ~25 lines, split the "dereference and format" concern out; keep it a
single-purpose script with no CLI flags.

### Gate

```
npm run build && npm run test && npm run test:format
```

Additionally run `npm run generate:schema && git diff --exit-code src/plugins/schema.json` — the exact command
CI will run — and confirm it exits 0.

### Commit

`feat(plugins): generate the aggregate JSON schema from zod definitions`

(Commit body must list the accepted old-vs-new deltas confirmed by the equivalence check.)

## Part 6 — Convert zod in-process for `x-password` masking in `apply.ts`

### Context

**`src/commands/browserforce/apply.ts`** — delete three things at the top of the file:

- `import { readFileSync } from 'fs';`
- `function camelToKebab(str: string): string` (lines ~5-8)
- `function loadPluginSchema(pluginName: string): unknown | undefined` (lines ~10-23) — the whole
  `try { … } catch (error) { return undefined; }` block. This is the swallowed error the design requires be
  removed (requirement 6): `package.json#files` ships only `/bin`, `/lib`, `/oclif.manifest.json` and `tsc` does
  not copy `.json`, so in the published package this read ALWAYS threw and masking silently degraded to regex
  matching.

Inside `run()`, the call site is in the `if (diff !== undefined) {` branch:

```ts
        // Load schema for this plugin to check for password fields
        const schema = loadPluginSchema(setting.key);
        // Mask sensitive values before logging (using schema if available)
        const maskedDiff = maskSensitiveValues(diff, '', schema) as typeof diff;
```

Replace with an in-process conversion using the `schemas` map from Part 5:

```ts
import { z } from 'zod';
import { schemas } from '../../plugins/index.js';
…
        const pluginSchema = schemas[setting.key];
        const schema = pluginSchema ? z.toJSONSchema(pluginSchema, { target: 'draft-7', io: 'input' }) : undefined;
        const maskedDiff = maskSensitiveValues(diff, '', schema) as typeof diff;
```

`setting.key` is typed `string` (from `src/config-parser.ts`'s `Config` type), so the lookup needs either an
index signature on `schemas` or a narrow; do NOT reach for a suppression directive — widen the lookup with
`schemas[setting.key as keyof typeof schemas]` or type `schemas` as `Record<string, z.ZodType>` at the export
site, whichever keeps the Part 5 exhaustiveness contract intact (it must still be a `tsc` error to add or drop a
key). Note the converted per-plugin schema has NO `definitions` bucket of its own when converted standalone —
zod inlines nested definitions unless they carry `.meta({ id })`, in which case they hoist into a local
`definitions` bucket that Part 1's `$ref` resolution handles. Verify both shapes in the test.

`maskSensitiveValues(value, keyPath, schema?)` in `src/plugins/utils.ts` keeps its signature — nothing changes there.

Masking behaviour is covered by unit tests in `test/utils.test.ts` (Part 1 and Part 4 already added the
auth-providers end-to-end case); `apply.ts` itself has no unit test today and gaining one would require mocking
the whole oclif command — do not build that harness. Instead pin the conversion contract at the `schemas` level.

### TDD steps

RED

1. `test/utils.test.ts`, in the `maskSensitiveValues` describe: import `schemas` from `../src/plugins/index.js`,
   convert `schemas.authProviders` exactly as `apply.ts` will
   (`z.toJSONSchema(schemas.authProviders, { target: 'draft-7', io: 'input' })`), and assert
   `maskSensitiveValues({ myProvider: { consumerSecret: 'shh', consumerKey: 'ck' } }, '', converted)` masks
   `consumerSecret` and leaves `consumerKey` intact. Should already pass from Part 4's test — restate it here
   against `schemas` rather than the direct import, so the map is the pinned surface.
2. Same describe: convert `schemas.security` (which hoists `certificateAndKeyManagement` into a local
   `definitions` bucket behind an `allOf`-wrapped `$ref`) and assert that the value at
   `certificateAndKeyManagement.importFromKeystore[0].password` is masked — note the path is relative to the
   PLUGIN's own config (that is what `apply.ts` passes as `diff`), so there is no leading `security.` segment.
   This proves the `$ref`/`allOf` traversal works on a real converted plugin schema, not just a hand-written
   fixture. It reaches the field via the `/password/i` fallback too, so also assert the schema-driven path by
   checking a sibling non-sensitive field (`certificateAndKeyManagement.importFromKeystore[0].filePath`) is
   left intact.
   Fails if Part 1's traversal missed the `definitions`-local case.
3. Grep-level RED: `grep -n "loadPluginSchema\|camelToKebab\|readFileSync" src/commands/browserforce/apply.ts`
   must return nothing after GREEN.

GREEN — delete the two helpers and the `fs` import, add the in-process conversion.

REFACTOR — if the conversion call reads awkwardly inline, lift it to a small module-private
`function toJsonSchema(key: string): unknown | undefined` in `apply.ts` — with no try/catch and no swallowed error.

### Gate

```
npm run build && npm run test && npm run test:format
```

### Commit

`fix(commands): mask password fields using in-process zod conversion`

## Part 7 — Validate user configs in `ConfigParser.parse()`

### Context

**`src/config-parser.ts`** — the whole file today is ~40 lines:

```ts
export class ConfigParser {
  public static parse(drivers: Drivers, data: Data): Config[] {
    const settings: Config[] = [];
    if (data?.settings) {
      for (const driverName of Object.keys(data.settings)) {
        if (drivers[driverName]) {
          settings.push({ Driver: drivers[driverName], key: driverName, value: data.settings[driverName] });
        } else {
          throw new Error(`Could not find plugin named '${driverName}' in definition: ${JSON.stringify(data)}`);
        }
      }
    } else {
      throw new Error(`Missing 'settings' attribute in definition: ${JSON.stringify(data)}`);
    }
    return settings;
  }
}
```

Target behaviour (design, "Runtime validation"):

- Keep the `Missing 'settings' attribute in definition: ${JSON.stringify(data)}` guard and its exact message,
  raised for a falsy/absent `settings` (the existing `if (data?.settings)` check stays first — do NOT try to map
  it out of a zod issue; keeping the literal check is simpler and preserves the message verbatim for callers and
  the existing test).
- Then `rootSchema.shape.settings.parse(data.settings)` inside a `try`. On `ZodError`, throw
  `new Error(\`Invalid browserforce configuration:\n${formatZodError(error)}\`)`. Re-throw anything that is not a
  `ZodError` untouched — no swallowed errors.
- The per-key `Could not find plugin named '…'` check is REPLACED: zod's `unrecognized_keys` issue on the
  settings object subsumes it. **Verify first** that `z.object({...}).parse()` actually rejects unknown keys at
  runtime — zod v4's default `z.object` strips unknown keys silently rather than erroring, in which case
  `rootSchema`'s `settings` object must be built with `z.strictObject(...)` in `src/plugins/schema.ts` instead.
  **Important:** `z.strictObject` also emits `additionalProperties: false` — but `io: 'input'` drops that key
  from the generated JSON Schema (verified), so the generated `schema.json` is unaffected. Regenerate and confirm
  `git diff src/plugins/schema.json` is empty after the change; if it is not, raise a blocker.
- New exported helper `export function formatZodError(error: z.ZodError): string` — put it in
  `src/config-parser.ts` (its only consumer) and render each issue as `<dot-path>: <message>` joined by `\n`,
  where the dot-path comes from `issue.path.join('.')`. For a root-level issue (empty path), use the message alone.
- Keep the `Drivers` / `Data` / `Config` local types and the returned `Config[]` shape exactly as they are —
  `src/browserforce-command.ts` and `apply.ts` depend on `{ Driver, key, value }`.

Import `rootSchema` from `./plugins/schema.js`. Check for an import cycle: `config-parser.ts` →
`plugins/schema.ts` → `plugins/index.ts` → the 25 plugin `index.ts` files → `plugin.js`. `config-parser.ts`
already imports `./plugin.js`, so no new cycle is introduced, but run `npm run build` early to confirm.

**Tests — `test/config-parser.test.ts`.** The file has one `describe('ConfigParser')` → `describe('parse()')`
with three tests:

1. `'should parse a valid config file'` — `{ settings: { security: {} } }` → `result[0].Driver.name === 'Security'`. Must still pass.
2. `'should fail parsing an invalid config file'` — `{ foo: { bar: { baz: true } } }` asserts
   `/Missing 'settings' attribute in definition:/`. Must still pass unchanged.
3. `'should fail parsing a config file with an invalid plugin'` — `{ settings: { foo: { … } } }` asserts
   `/Could not find plugin named 'foo' in definition: /`. **This assertion must be REWRITTEN** to
   `/Invalid browserforce configuration:/` (and should additionally assert the message mentions `foo`).

**New config-fixture tests** (design: "Unit — config fixtures"). Add to `test/config-parser.test.ts` a
`describe('fixtures')` that globs every real config in the repo and asserts each parses:

- `examples/full.json` (keys: salesforceToSalesforce, customerPortal, highVelocitySalesSettings,
  companyInformation, recordTypes, picklists, homePageLayouts) and `examples/empty.json` (`settings: {}`).
- All 63 non-schema `.json` files under `src/plugins/**` — enumerate them with `readdirSync(..., { recursive: true })`
  and filter out `schema.json` (which no longer exists after Part 5 anyway, except the aggregate).
  **Caveat:** several fixtures are intentionally invalid inputs for e2e negative tests —
  `src/plugins/company-information/currency-invalid.json` and `src/plugins/email-deliverability/invalid.json`.
  Inspect both: if they are invalid at the *value* level (an unsupported currency string / access level not in
  the enum) they will now FAIL zod validation. Exclude them from the "must parse" list by name, with a comment
  saying why, and add a companion assertion that `email-deliverability/invalid.json` fails with an enum message
  (turning the exclusion into a positive test). If `currency-invalid.json` is a plain `string`, it stays valid
  and needs no exclusion — check before excluding.
- Sub-directory fixtures such as `src/plugins/picklists/field-dependencies/set.json` are keyed under the PARENT
  plugin (`{"settings": {"picklists": {"fieldDependencies": [...]}}}`) — read a couple to confirm before
  assuming a shape. Any fixture whose top-level shape is not `{ settings: {...} }` should be skipped with a
  named exclusion, not silently.

This fixture sweep is the load-bearing regression net for "the migration did not tighten any plugin's shape" —
if one fails, the fix is almost always the `schema.ts`, not the fixture.

### TDD steps

RED

1. `test/config-parser.test.ts`: rewrite test 3's expected message to `/Invalid browserforce configuration:/`.
   Fails: the old `Could not find plugin named 'foo'` message is still thrown.
2. New test: `{ settings: { densitySettings: { density: 'Roomy' } } }` throws
   `/Invalid browserforce configuration:\ndensitySettings\.density: /`.
   Fails: nothing validates values today.
3. New test: `{ settings: { picklists: { picklistValues: [{ metadataType: 'CustomField' }] } } }` (missing the
   required `metadataFullName`) throws with a path containing `picklists.picklistValues.0.metadataFullName`.
   Fails: same.
4. New `describe('fixtures')`: `examples/full.json`, `examples/empty.json` and every non-excluded fixture under
   `src/plugins/**` parses without throwing.
   Fails: no validation exists yet — and once it does, any over-tightened `schema.ts` from Parts 2–4 surfaces here.
5. Existing tests 1 and 2 must stay green throughout (they are the "do not break the contract" guards).

GREEN — add `formatZodError`, wire `rootSchema.shape.settings.parse` into `parse()`, switch `settings` to
`z.strictObject` in `src/plugins/schema.ts` if unknown-key rejection requires it (and re-run the generator to
confirm the emitted JSON is unchanged).

REFACTOR — if `formatZodError` grows conditionals for issue kinds, keep it to the single documented shape
(`<dot-path>: <message>`); resist per-issue special-casing.

### Gate

```
npm run build && npm run test && npm run test:format
```

### Commit

`feat(config): validate browserforce configs against the generated zod schema`

## Part 8 — Scaffolding templates and CONTRIBUTING.md

### Context

Tooling and prose only; no `src/` behaviour delta (the only `src/` touch is what hygen injects into
`src/plugins/index.ts`, which is template output, not hand-written code).

**`_templates/plugin/new/`** — current files and their frontmatter:

| file | `to:` / behaviour |
|---|---|
| `schema.json.ejs.t` | `to: src/plugins/<paramCase>/schema.json` — **rename to `schema.ts.ejs.t`** |
| `plugins-schema.ejs.t` | `to: src/plugins/schema.json`, `inject: true`, `after: "      \"properties\": {"` — **delete the file**, the aggregate is generated and never injected into |
| `index.ejs.t` | `to: src/plugins/<paramCase>/index.ts`, `sh: "npx prettier --write 'src/plugins/<paramCase>/*' 'src/plugins/index.ts'"` |
| `plugins-index.ejs.t` | `to: src/plugins/index.ts`, `inject: true`, `before: export {` — emits `import { <Name> as <camelName> } from './<paramCase>/index.js';` |
| `plugins-index-export.ejs.t` | `to: src/plugins/index.ts`, `inject: true`, `eof_last: false`, `after: export {` — emits `  <camelName>,` |
| `enable.json.ejs.t` / `disable.json.ejs.t` | unchanged (`"$schema": "../schema.json"` still resolves to the generated aggregate) |
| `index.e2e-spec.ejs.t` | unchanged |

Changes:

1. **`schema.ts.ejs.t`** (replacing `schema.json.ejs.t`) — `to: src/plugins/<%= h.changeCase.paramCase(name) %>/schema.ts`, emitting:
   ```ts
   import { z } from 'zod';

   export const schema = z
     .object({
       enabled: z
         .boolean()
         .meta({
           title: 'Enable <%= h.changeCase.pascalCase(name) %>',
           description: 'The description you want to be displayed as toolip when the user is editing the configuration',
         })
         .optional(),
     })
     .meta({ id: '<%= h.changeCase.camelCase(name) %>', title: '<%= h.changeCase.pascalCase(name) %> Settings' });
   ```
   (title/description text carried over verbatim from the old JSON template, typo included.)
2. **`index.ejs.t`** — replace
   ```ts
   export type Config = {
     enabled: boolean;
   };
   ```
   with `import { schema } from './schema.js';` (alongside the existing `BrowserforcePlugin` import) plus
   `export type Config = z.infer<typeof schema>;` and `import { z } from 'zod';`.
   Extend its `sh:` hook to also regenerate the aggregate:
   `sh: "npx prettier --write 'src/plugins/<%= h.changeCase.paramCase(name) %>/*' 'src/plugins/index.ts' && npm run generate:schema"`.
   Note the plugin body uses `config.enabled` in `apply` and builds `{ enabled: … }` in `retrieve`; with
   `enabled` optional, `page.locator(ENABLED_SELECTOR).setChecked(config.enabled)` will not type-check —
   use `setChecked(config.enabled ?? false)` in the template.
3. **Two new injection templates into `src/plugins/index.ts`**, mirroring the existing pair:
   - `plugins-index-schema-import.ejs.t`: `inject: true`, `before: export const schemas`, emitting
     `import { schema as <camelName>Schema } from './<paramCase>/schema.js';`
   - `plugins-index-schema-entry.ejs.t`: `inject: true`, `eof_last: false`,
     `after: "export const schemas"` (match on whatever exact anchor line Part 5 produced — read
     `src/plugins/index.ts` and pin the literal), emitting `  <camelName>: <camelName>Schema,`
   Hygen anchors are literal strings; whatever anchor Part 5's `schemas` declaration provides must be stable and
   unique in the file. If it is not, adjust the Part 5 formatting (e.g. keep `export const schemas: Record<...> = {`
   on one line) rather than inventing a fragile regex anchor.

**Scaffolding verification (design: "Test strategy — Scaffolding").** Copy the worktree to a `mktemp -d`
throwaway (state-mutating probe — NEVER run the generator in the worktree), run
`npm run generate:plugin -- --name ScratchProbe` there, then `npm run generate:schema` and `npx tsc -p .`, and
assert `scratchProbe` appears in `src/plugins/schema.json`'s `settings.properties` and in the `schemas` map.
Discard the copy. Record the result in the commit body; do not commit any generated ScratchProbe files.

**`CONTRIBUTING.md`** — the affected region is roughly lines 80–170:

- The `tree src/plugins/admins-can-log-in-as-any-user` block (~line 82–89): change
  `└── schema.json         <-- schema for configuration` to
  `└── schema.ts           <-- schema for configuration (zod)` and reorder so `schema.ts` sorts after `index.ts`.
- Line ~91 `We'll start with \`schema.json\`.` → `schema.ts`.
- Heading (~line 93) `#### Configuration Schema (\`schema.json\`)` → `#### Configuration Schema (\`schema.ts\`)`.
- Body (~line 95): replace the JSON-Schema framing with: plugin authors write a
  [zod](https://zod.dev) schema in `schema.ts`; the plugin's `Config` type is derived from it with
  `z.infer<typeof schema>`, so type and schema cannot drift.
- Replace the `**schema.json**` fenced JSON block (~lines 99–118) with the equivalent `**schema.ts**` TypeScript
  block — the same one the hygen template emits.
- Keep the `**config/setup-admin-login-as-any.json**` example block and the "entry point (key) is automatically
  determined by the plugin name" paragraph as they are.
- Add a short new paragraph after the example: `src/plugins/schema.json` is **generated** from all plugin
  schemas by `npm run generate:schema` (also run by `npm run build` and by the plugin scaffolder), is committed,
  and must never be edited by hand; CI fails if the committed file differs from the generated one.
- Add a short `x-password` paragraph — currently undocumented. Per decision 8 the API is the `password()` helper
  exported from `src/plugins/utils.ts`: wrap any secret field (`consumerSecret: password(z.string()).optional()`)
  and its value is masked in `browserforce apply` output.
- Line ~165: `Both the result of the \`retrieve\` function and the argument of the \`apply\` function are objects in the format defined in your \`schema.json\`.` → `\`schema.ts\``. Line ~158's
  "described as JSON schema" phrasing can stay — the plan is still JSON-shaped.
- Also update `README.md:36` only if it names a per-plugin schema file; the aggregate URL
  `https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json` is unchanged
  and must stay exactly as it is.

### TDD steps

This part has no `src/` behaviour delta, so the loop is verification-first rather than mocha-RED:

1. RED (mechanical): `grep -rn "schema\.json" _templates/ CONTRIBUTING.md` — every hit outside the
   `enable.json`/`disable.json` `"$schema": "../schema.json"` pointers and the generated-aggregate paragraph is a
   remaining item. Run it first to enumerate the work; it must come back clean (modulo those exceptions) at the end.
2. RED (scaffolding): in a `mktemp -d` copy of the worktree, `npm run generate:plugin -- --name ScratchProbe`
   currently writes a `schema.json` and injects a `$ref` into the generated aggregate.
   Fails the goal: requirement 8 says the scaffold must produce no JSON Schema file and no injection.
3. GREEN: rename/delete/add the templates, update `CONTRIBUTING.md`, re-run the throwaway scaffolding probe and
   confirm `npm run generate:schema && npx tsc -p .` succeed and `scratchProbe` lands in the aggregate.
4. REFACTOR: keep the two new injection templates symmetrical with the two existing driver-injection templates
   (same frontmatter keys, same ordering) so the next author sees one pattern, not two.

### Gate

```
npm run build && npm run test && npm run test:format
```

(The full gate still applies — `index.ejs.t`'s template changes are not compiled, but `npm run build` proves
Part 5's generator and the committed `schema.json` are still consistent after any `src/plugins/index.ts`
formatting adjustment made for the hygen anchor.)

### Commit

`docs(contributing): document the zod-first schema workflow and update the plugin scaffolder`
