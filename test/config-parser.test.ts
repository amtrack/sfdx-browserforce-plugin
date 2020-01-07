import * as assert from 'assert';
import ConfigParser from '../src/config-parser';
import * as DRIVERS from '../src/plugins';

describe('ConfigParser', () => {
  describe('parse()', () => {
    it('should parse a valid definition file', () => {
      const definition = {
        settings: {
          security: {
            loginAccessPolicies: {
              adminsCanLogInAsAnyUser: true
            }
          }
        }
      };
      const result = ConfigParser.parse(DRIVERS, definition);
      assert.deepEqual(result[0].Driver.default.name, 'Security');
    });
  });
});
