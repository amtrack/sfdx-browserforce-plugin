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
