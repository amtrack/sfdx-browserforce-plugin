import { defineUseCases } from '../../../scripts/use-cases.js';
import { relateContactToMultipleAccountsSchema } from './index.js';

export const useCases = defineUseCases(relateContactToMultipleAccountsSchema, [
  {
    slug: '01-consultants-working-for-several-clients',
    title: 'Independent consultants work for several client accounts',
    given: { enabled: false },
    config: { enabled: true },
    story: [
      'Tailspin Consulting staffs freelance consultants on client projects. A consultant is a contact of their own company, but also works for two or three client accounts at a time, and the account managers want to see them on each of those accounts.',
      '**Allow users to relate a contact to multiple accounts (1)** creates the Account Contact Relationship object and the "Related Contacts" list for that. The `AccountSettings` metadata has a flag for it, but deploying it does not always make the object available, and the deployment of the fields and layouts that use it then fails. Enabling it in Setup with this config always works, before the metadata is deployed.',
    ],
    async shoot(doc) {
      await using page = await doc.open('/accounts/accountSetup.apexp');
      const ui = await doc.within(page, '.bPageTitle');
      await doc.shot('account-settings', page, {
        context: [ui.locator('.bPageTitle'), ui.locator('.bPageBlock')],
        pills: { enabled: ui.locator('input[id$=":sharedContactsCheckBox"]') },
      });
    },
  },
]);
