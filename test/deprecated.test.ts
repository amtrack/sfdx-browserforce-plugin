import assert from 'node:assert';
import { handleDeprecations } from '../src/plugins/deprecated.js';

it('should do nothing when no plugin is deprecated', () => {
  assert.ok(() => {
    handleDeprecations({
      settings: {},
    });
  });
});

it('should throw when a plugin is deprecated', () => {
  assert.throws(() => {
    handleDeprecations({
      settings: {
        communities: { enabled: true },
      },
    });
  }, /The sfdx-browserforce-plugin setting 'communities' is deprecated/);
});

it('should throw when a setting of a plugin', () => {
  assert.throws(() => {
    handleDeprecations({
      settings: {
        security: {
          loginAccessPolicies: {
            administratorsCanLogInAsAnyUser: true,
          },
        },
      },
    });
  }, /The sfdx-browserforce-plugin setting 'security.loginAccessPolicies' is deprecated/);
});

it('should throw for deferSharingCalculation', () => {
  assert.throws(() => {
    handleDeprecations({
      settings: {
        deferSharingCalculation: { suspend: true },
      },
    });
  }, /setting 'deferSharingCalculation' is deprecated[\s\S]*Hall-of-Fame#defersharingcalculation/);
});

it('should not throw for a missing definition or settings', () => {
  handleDeprecations(undefined);
  handleDeprecations({});
});
