import { defineUseCases } from '../../../scripts/use-cases.js';
import { emailDeliverabilitySchema, ACCESS_LEVEL_SELECTOR } from './index.js';

export const useCases = defineUseCases(emailDeliverabilitySchema, [
  {
    slug: '01-qa-team-tests-email-alerts',
    title: 'The QA team tests the email alerts of a new process',
    given: { accessLevel: 'System email only' },
    config: { accessLevel: 'All email' },
    story: [
      'Wide World Importers adds approval and escalation emails to its case management process. Each release is tested in a fresh sandbox, and a new sandbox only sends system emails such as password resets: the email alerts of the process never reach the testers, who report them as bugs.',
      'The Metadata API cannot set the **Access level (1)** of email deliverability: `EmailAdministrationSettings` has no field for it. Applying this config right after the sandbox is created lets the flows and workflow rules send their emails to the test users. Use `System email only` in the opposite situation, for an org loaded with real customer data that must never email them.',
    ],
    captures: {
      deliverability: {
        clip: { x: 240, y: 120, width: 1180, height: 300 },
      },
    },
    async shoot(doc) {
      await using page = await doc.open('/email-admin/editOrgEmailSettings.apexp');
      const ui = await doc.within(page, ACCESS_LEVEL_SELECTOR);
      await doc.shot('deliverability', page, {
        pills: { accessLevel: ui.locator(ACCESS_LEVEL_SELECTOR) },
      });
    },
  },
]);
