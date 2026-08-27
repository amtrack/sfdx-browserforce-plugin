import assert from 'assert';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
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
      }, /Invalid browserforce configuration:[\s\S]*foo/);
    });
    it('should fail parsing a config with an invalid value', () => {
      const definition = {
        settings: {
          densitySettings: { density: 'Roomy' },
        },
      };
      assert.throws(() => {
        ConfigParser.parse(DRIVERS, definition);
      }, /Invalid browserforce configuration:\ndensitySettings\.density: /);
    });
    it('should fail parsing a config with a missing required nested property', () => {
      const definition = {
        settings: {
          picklists: {
            picklistValues: [{ metadataType: 'CustomField' }],
          },
        },
      };
      assert.throws(() => {
        ConfigParser.parse(DRIVERS, definition);
      }, /picklists\.picklistValues\.0\.metadataFullName/);
    });
  });

  describe('fixtures', () => {
    // intentionally invalid fixtures used by e2e negative tests; excluded from the "must parse" sweep
    const EXCLUDED_FIXTURES = [
      'src/plugins/email-deliverability/invalid.json', // accessLevel is not one of the enum values
    ];

    it('should parse examples/full.json', () => {
      const definition = JSON.parse(readFileSync('examples/full.json', 'utf8'));
      assert.doesNotThrow(() => ConfigParser.parse(DRIVERS, definition));
    });

    it('should parse examples/empty.json', () => {
      const definition = JSON.parse(readFileSync('examples/empty.json', 'utf8'));
      assert.doesNotThrow(() => ConfigParser.parse(DRIVERS, definition));
    });

    const fixtures = readdirSync('src/plugins', { recursive: true, encoding: 'utf8' })
      .filter((f) => f.endsWith('.json') && f !== 'schema.json')
      .map((f) => join('src/plugins', f).split('\\').join('/'))
      .filter((f) => !EXCLUDED_FIXTURES.includes(f));

    for (const fixture of fixtures) {
      it(`should parse ${fixture}`, () => {
        const definition = JSON.parse(readFileSync(fixture, 'utf8'));
        assert.doesNotThrow(() => ConfigParser.parse(DRIVERS, definition));
      });
    }

    it('should fail parsing src/plugins/email-deliverability/invalid.json with an enum message', () => {
      const definition = JSON.parse(readFileSync('src/plugins/email-deliverability/invalid.json', 'utf8'));
      assert.throws(() => {
        ConfigParser.parse(DRIVERS, definition);
      }, /emailDeliverability\.accessLevel: /);
    });
  });
});
