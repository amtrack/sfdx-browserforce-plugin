import * as assert from 'assert';
import * as DRIVERS from '../src/plugins';
import SchemaParser from '../src/schema-parser';

describe('SchemaParser', () => {
  describe('parse()', () => {
    it('should parse a valid definition file', () => {
      const definition = {
        settings: {
          loginAccessPolicies: {
            adminsCanLogInAsAnyUser: true
          }
        }
      };
      const result = SchemaParser.parse(DRIVERS, definition);
      assert.deepEqual(
        result[0].Driver.default.schema.title,
        'Login Access Policies'
      );
    });
  });
});
