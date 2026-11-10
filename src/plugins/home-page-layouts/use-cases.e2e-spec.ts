import { defineUseCases } from '../../../scripts/use-cases.js';
import { homePageLayoutsSchema } from './index.js';

export const useCases = defineUseCases(homePageLayoutsSchema, [
  {
    slug: '01-assign-the-sales-home-page',
    title: 'Give sales users their own home page',
    given: {
      homePageLayoutAssignments: [
        { profile: 'Standard User', layout: '' },
        { profile: 'System Administrator', layout: '' },
      ],
    },
    config: {
      homePageLayoutAssignments: [
        { profile: 'Standard User', layout: 'DE Default' },
        { profile: 'System Administrator', layout: '' },
      ],
    },
    story: [
      'The sales reps of Acme still work in Salesforce Classic, and their home tab should show the dashboard snapshot and the custom links of the **DE Default** home page layout. The Metadata API deploys the `HomePageLayout` itself, but the `Profile` type has no field for its home page layout: which profile sees which layout is only set on the Home Page Layout Assignment page of Setup.',
      'This config gives the **Standard User (1)** profile the **DE Default (2)** layout, and keeps the **System Administrator (3)** profile on the standard home page: an empty `layout` **(4)** stands for **Home Page Default**. Profiles are named as Setup shows them, and the profiles the config does not list keep their layout.',
    ],
    captures: {
      'home-page-layout-assignment': {
        pills: {
          'homePageLayoutAssignments[0].profile': { px: 37.2, py: 46.2 },
          'homePageLayoutAssignments[1].profile': { px: 33.2, py: 52.1 },
        },
      },
    },
    async shoot(doc) {
      await using page = await doc.open('/setup/ui/assignhomelayoutedit.jsp', { height: 2000 });
      const ui = await doc.within(page, 'label:has-text("Standard User")');
      await doc.shot('home-page-layout-assignment', page, {
        pills: {
          'homePageLayoutAssignments[0].profile': ui.locator('label:has-text("Standard User")'),
          'homePageLayoutAssignments[0].layout': ui.locator('tr:has(> td > label:has-text("Standard User")) select'),
          'homePageLayoutAssignments[1].profile': ui.locator('label:has-text("System Administrator")'),
          'homePageLayoutAssignments[1].layout': ui.locator(
            'tr:has(> td > label:has-text("System Administrator")) select',
          ),
        },
      });
    },
  },
]);
