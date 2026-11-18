# Use cases

`src/plugins/<folder>/use-cases.md` is optional; `npm run generate:plugin` creates a placeholder to replace or delete.

- Write for an end user: an admin who never read the code.
- Per use case: a `##` heading, the story (a named company, its admin's need, one sentence on why the Metadata API
  cannot do it, what the config changes; three to six sentences) and its config as a `json` block with `$schema`.
- Only what the Metadata API cannot do. A setting the Metadata API now covers belongs in `src/plugins/deprecated.ts`:
  report it to the user instead of documenting it.
- Order them from the simplest to the most advanced.
