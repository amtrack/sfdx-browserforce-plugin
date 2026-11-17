import assert from 'assert';
import { HomePageLayouts, homePageLayoutsSchema } from './index.js';
import { capture } from '../../../test/capture.js';

describe(HomePageLayouts.name, function () {
  let plugin: HomePageLayouts;
  before(() => {
    plugin = new HomePageLayouts(global.browserforce);
  });

  const configPageDefault = {
    homePageLayoutAssignments: [
      {
        profile: 'Standard User',
        layout: '',
      },
      {
        profile: 'System Administrator',
        layout: '',
      },
    ],
  };
  const configOrgDefault = {
    homePageLayoutAssignments: [
      {
        profile: 'Standard User',
        layout: 'DE Default',
      },
      {
        profile: 'System Administrator',
        layout: 'DE Default',
      },
    ],
  };
  it('should assign some layouts', async () => {
    await plugin.run(configPageDefault);
  });
  it('should be assigned', async () => {
    const res = await plugin.run(configPageDefault);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
  it(
    'should assign the DE Default home page to the Standard User profile @capture',
    capture(homePageLayoutsSchema, {
      config: {
        homePageLayoutAssignments: [
          { profile: 'Standard User', layout: 'DE Default' },
          { profile: 'System Administrator', layout: '' },
        ],
      },
      pages: {
        screenshot: {
          positions: {
            'homePageLayoutAssignments[0].profile': { px: 37.2, py: 46.2 },
            'homePageLayoutAssignments[1].profile': { px: 33.2, py: 52.1 },
          },
          height: 2000,
          pills: {
            'homePageLayoutAssignments[0].profile': 'label:has-text("Standard User")',
            'homePageLayoutAssignments[0].layout': 'tr:has(> td > label:has-text("Standard User")) select',
            'homePageLayoutAssignments[1].profile': 'label:has-text("System Administrator")',
            'homePageLayoutAssignments[1].layout': 'tr:has(> td > label:has-text("System Administrator")) select',
          },
        },
      },
    }),
  );
  it('should unassign some layouts', async () => {
    await plugin.apply(configOrgDefault);
  });
  it('should be unassigned', async () => {
    const res = await plugin.run(configOrgDefault);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
});
