import assert from 'node:assert';
import { findDeprecations, handleDeprecations } from '../src/plugins/deprecated.js';

it('should do nothing when no plugin is deprecated', () => {
  assert.doesNotThrow(() => {
    handleDeprecations({
      settings: {},
    });
  });
});

it('should do nothing when there is no config', () => {
  assert.doesNotThrow(() => handleDeprecations(undefined));
  assert.deepStrictEqual(findDeprecations(undefined), []);
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

it('should throw for the removed deferSharingCalculation setting', () => {
  assert.throws(() => {
    handleDeprecations({
      settings: {
        deferSharingCalculation: { suspend: true },
      },
    });
  }, /The sfdx-browserforce-plugin setting 'deferSharingCalculation' is deprecated[\s\S]*#defersharingcalculation/);
});

it('should throw with the alternatives for the retired salesforceToSalesforce setting', () => {
  assert.throws(
    () => handleDeprecations({ settings: { salesforceToSalesforce: { enabled: true } } }),
    (err: Error) =>
      err.message ===
      `The sfdx-browserforce-plugin setting 'salesforceToSalesforce' is deprecated and has been removed.
❌ Salesforce to Salesforce has been retired.
👉 Use one of these alternative solutions: Partner Cloud, Data Cloud One, MuleSoft Anypoint, or MuleSoft for Flow.
👉 Please see the instructions at https://amtrack.github.io/sfdx-browserforce-plugin/hall-of-fame/#salesforcetosalesforce.`,
  );
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

it('should list every deprecated setting used', () => {
  assert.deepStrictEqual(
    findDeprecations({ settings: { communities: {}, security: { sharing: {}, identityProvider: {} } } }).map(
      (deprecated) => deprecated.path,
    ),
    ['communities', 'security.identityProvider', 'security.sharing'],
  );
});
