import { defineUseCases } from '../../../scripts/use-cases.js';
import { lightningExperienceSettingsSchema } from './index.js';

export const useCases = defineUseCases(lightningExperienceSettingsSchema, [
  {
    slug: '01-activate-a-standard-theme',
    title: 'Bring back the standard Salesforce theme after a rebranding pilot',
    given: { activeThemeName: 'SalesforceCosmos' },
    config: { activeThemeName: 'Lightning' },
    restore: false,
    story: [
      'During a pilot, the marketing team of Northwind Traders activated the **Salesforce Cosmos** theme in every sandbox. The pilot is over and each environment must go back to the standard **Lightning Blue (1)** theme, whose API name is `Lightning`.',
      'The Metadata API has an `activeThemeName` field in `LightningExperienceSettings`, but it can only activate custom themes: a deployment cannot switch an org back to a standard theme such as `Lightning`, `LightningLite` or `SalesforceCosmos`. With this config, the same deployment that ships the metadata restores the theme, and the check mark of the **Themes and Branding** page moves to the active theme.',
    ],
    async shoot(doc) {
      await using page = await doc.open('/lightning/setup/ThemingAndBranding/home');
      const ui = await doc.within(page, '#setupComponent table');
      await doc.shot('themes-and-branding', page, {
        context: [ui.locator('#setupComponent table')],
        pills: {
          activeThemeName: ui.locator(
            '#setupComponent table > tbody > tr:has(td:nth-child(2) lightning-base-formatted-text:text-is("Lightning"))',
          ),
        },
      });
    },
  },
]);
