import { defineUseCases } from '../../../scripts/use-cases.js';
import { companyInformationSchema, CURRENCY_DROPDOWN_SELECTOR } from './index.js';

export const useCases = defineUseCases(companyInformationSchema, [
  {
    slug: '01-south-african-subsidiary',
    title: 'A South African subsidiary invoices in rand',
    given: { defaultCurrencyIsoCode: 'English (United States) - USD' },
    config: { defaultCurrencyIsoCode: 'English (South Africa) - ZAR' },
    story: [
      'Acme opens a sales office in Johannesburg with its own Salesforce org. The org was created with the defaults of the US admin who signed it up, so every opportunity, quote and report shows amounts in US dollars.',
      'The currency of an org without multiple currencies is its **Currency Locale (1)**, a field of the Company Information page that no Metadata API type holds. Applying this config in every new environment of the subsidiary, from the scratch orgs of the developers to production, switches it to `English (South Africa) - ZAR` without anyone clicking in Setup.',
    ],
    async shoot(doc) {
      await using page = await doc.open(`/${doc.orgId}/e`);
      const ui = await doc.within(page, '#ep .pbBody');
      await doc.shot('company-information', page, {
        context: [ui.locator('#ep .pbBody')],
        pills: { defaultCurrencyIsoCode: ui.locator(CURRENCY_DROPDOWN_SELECTOR) },
      });
    },
  },
]);
