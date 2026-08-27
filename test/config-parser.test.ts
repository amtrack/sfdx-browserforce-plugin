import assert from 'assert';
import { ConfigParser } from '../src/config-parser.js';
import { type BrowserforcePlugin } from '../src/plugin.js';
import * as pluginExports from '../src/plugins/index.js';

// `pluginExports` also carries `schemas` (the zod schema map used to generate schema.json),
// which is not a driver; ConfigParser only wants the driver classes.
const DRIVERS = Object.fromEntries(Object.entries(pluginExports).filter(([key]) => key !== 'schemas')) as Record<
  string,
  typeof BrowserforcePlugin
>;

describe('ConfigParser', () => {
  describe('parse()', () => {
    it('should parse a valid config file', () => {
      const definition = {
        settings: {
          security: {},
        },
      };
      const result = ConfigParser.parse(DRIVERS, definition);
      assert.deepStrictEqual(result[0].Driver.name, 'Security');
    });
    it('should fail parsing an invalid config file', () => {
      const definition = {
        foo: {
          bar: {
            baz: true,
          },
        },
      };
      // workaround to disable static type checking
      const anonymousDefinition = JSON.parse(JSON.stringify(definition));
      assert.throws(() => {
        ConfigParser.parse(DRIVERS, anonymousDefinition);
      }, /Missing 'settings' attribute in definition:/);
    });
    it('should fail parsing a config file with an invalid plugin', () => {
      const definition = {
        settings: {
          foo: {
            bar: {
              baz: true,
            },
          },
        },
      };
      assert.throws(() => {
        ConfigParser.parse(DRIVERS, definition);
      }, /Could not find plugin named 'foo' in definition: /);
    });
  });
});
