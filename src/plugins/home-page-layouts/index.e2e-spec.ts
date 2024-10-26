import assert from 'assert';
import { HomePageLayouts } from './index.js';

describe(HomePageLayouts.name, function () {
  let plugin: HomePageLayouts;
  before(() => {
    plugin = new HomePageLayouts(global.bf);
  });

  const configPageDefault = {
    homePageLayoutAssignments: [
      {
        profile: 'Standard User',
        layout: ''
      },
      {
        profile: 'System Administrator',
        layout: ''
      }
    ]
  };
  const configOrgDefault = {
    homePageLayoutAssignments: [
      {
        profile: 'Standard User',
        layout: 'DE Default'
      },
      {
        profile: 'System Administrator',
        layout: 'DE Default'
      }
    ]
  };
  it('should assign some layouts', async () => {
    await plugin.run(configPageDefault);
  });
  it('should be assigned', async () => {
    const res = await plugin.run(configPageDefault);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
  it('should unassign some layouts', async () => {
    await plugin.apply(configOrgDefault);
  });
  it('should be unassigned', async () => {
    const res = await plugin.run(configOrgDefault);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
});
