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
    it('should fail parsing an invalid definition file', () => {
      const definition = {
        foo: {
          bar: {
            baz: true
          }
        }
      };
      assert.throws(() => {
        ConfigParser.parse(DRIVERS, definition);
      }, /Missing 'settings' attribute in definition:/);
    });
    it('should fail parsing a definition file with an invalid plugin', () => {
      const definition = {
        settings: {
          foo: {
            bar: {
              baz: true
            }
          }
        }
      };
      assert.throws(() => {
        ConfigParser.parse(DRIVERS, definition);
      }, /Could not find plugin named 'foo' in definition: /);
    });
  });
});
