import { defineUseCases } from '../../../scripts/use-cases.js';
import { historyTrackingSchema } from './index.js';

export const useCases = defineUseCases(historyTrackingSchema, [
  {
    slug: '01-track-person-account-fields',
    title: 'Track the history of Person Account fields',
    given: [{ objectApiName: 'Account', enableHistoryTracking: false }],
    config: [
      {
        objectApiName: 'Account',
        enableHistoryTracking: true,
        fieldHistoryTracking: [
          { fieldApiName: 'PersonBirthdate', enableHistoryTracking: true },
          { fieldApiName: 'Test__pc', enableHistoryTracking: true },
        ],
      },
    ],
    story: [
      "A wealth management firm keeps its private clients as Person Accounts, and its compliance officers must see who changed a client's birthdate or the custom fields of the person, and when. History tracking of a Person Account field is set on the Account, but the Metadata API only sets `trackHistory` on the Contact field, which does not reach its Person Account twin (`__pc`).",
      'This config turns on the history of **Account (1)** with **Enable Account History (2)**, then tracks the fields of the person **(3)**: the standard Birthdate (`PersonBirthdate`) and the custom field `Test__pc`. Fields are named by their API name as seen from the Account, with the `__pc` suffix for the custom fields of the person.',
    ],
    async shoot(doc) {
      await using page = await doc.open('/ui/setup/layout/FieldHistoryTracking?pEntity=Account', { height: 1600 });
      const ui = await doc.within(page, '.bPageTitle');
      await doc.shot('account-field-history', page, {
        context: [ui.locator('.bPageTitle')],
        pills: {
          '[0].objectApiName': ui.locator('.bPageTitle h1'),
          '[0].enableHistoryTracking': ui.locator('label[for="enable"]'),
          '[0].fieldHistoryTracking': { locator: ui.locator('#PersonBirthdate_fht'), in: 'after' },
        },
      });
    },
  },
]);
