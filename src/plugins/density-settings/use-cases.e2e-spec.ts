import { defineUseCases } from '../../../scripts/use-cases.js';
import { densitySettingsSchema } from './index.js';

export const useCases = defineUseCases(densitySettingsSchema, [
  {
    slug: '01-compact-for-the-contact-center',
    title: 'Contact center agents see more records on their laptops',
    given: { density: 'Comfy' },
    config: { density: 'Compact' },
    story: [
      'The agents of Pinewood Insurance answer claims on 13-inch laptops. With the default **Comfy** density, a case list view shows a dozen rows and the related lists of an account need several scrolls.',
      'Choosing **Compact (1)** as the default density of the org puts labels next to their values and tightens every list, so the agents see about a third more records without zooming out. Agents who prefer the airier layout can still switch back in their own settings: this config only changes the default of the org, which the Metadata API cannot set.',
    ],
    async shoot(doc) {
      await using page = await doc.open('/lightning/setup/DensitySetup/home');
      const ui = await doc.within(page, 'one-density-visual-picker');
      await doc.shot('density-settings', page, {
        context: [ui.locator('one-density-visual-picker')],
        pills: {
          density: ui.locator('one-density-visual-picker-item:has(input[name="options"][value="Compact"]) label'),
        },
      });
    },
  },
]);
