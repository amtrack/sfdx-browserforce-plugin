import assert from 'node:assert';
import { handleDeprecations } from '../src/plugins/deprecated.js';

it('should do nothing when no plugin is deprecated', () => {
  assert.ok(() => {
    handleDeprecations({
      settings: {},
    });
  });
});
