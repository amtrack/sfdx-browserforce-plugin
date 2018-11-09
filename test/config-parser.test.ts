import * as assert from 'assert';
import * as DRIVERS from '../src/plugins';
import ConfigParser from '../src/config-parser';

describe('ConfigParser', () => {
  describe('parse()', () => {
    it('should parse a valid definition file', () => {
      const definition = {
        settings: {
          loginAccessPolicies: {
            adminsCanLogInAsAnyUser: true
          }
        }
      };
      const result = ConfigParser.parse(DRIVERS, definition);
      assert.deepEqual(
        result[0].Driver.default.name,
        'LoginAccessPolicies'
      );
    });
  });
});
