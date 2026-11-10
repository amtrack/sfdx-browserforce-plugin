---
to: src/plugins/<%= h.changeCase.paramCase(name) %>/use-cases.e2e-spec.ts
---
<%
  const camelCase = h.changeCase.camelCase(name);
_%>
import { defineUseCases } from '../../../scripts/use-cases.js';
import { BASE_PATH, ENABLED_SELECTOR, <%= camelCase %>Schema } from './index.js';

// The use cases shown on the documentation page of the setting, run by `npm run docs:capture` in a scratch org to
// take their "Before" and "After" screenshots: see .claude/skills/document-setting/SKILL.md, then run
// /document-setting <%= camelCase %>.
export const useCases = defineUseCases(<%= camelCase %>Schema, [
  {
    slug: '01-<%= h.changeCase.paramCase(name) %>',
    title: 'TODO the use case in a few words, e.g. "Admins of the support team log in as any user"',
    given: { enabled: false },
    config: { enabled: true },
    story: [
      'TODO the story of an admin who needs this setting, and why the Metadata API cannot do it.',
      'TODO what the config does, citing the pills in bold like **Enable (1)**.',
    ],
    async shoot(doc) {
      await using page = await doc.open(BASE_PATH);
      const ui = await doc.within(page, ENABLED_SELECTOR);
      await doc.shot('<%= h.changeCase.paramCase(name) %>', page, {
        pills: { enabled: ui.locator(ENABLED_SELECTOR) },
      });
    },
  },
]);
