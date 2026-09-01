import assert from 'assert';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { ConfigParser } from '../src/config-parser.js';
import { drivers, schemas } from '../src/plugins/index.js';

describe('ConfigParser', () => {
  describe('parse()', () => {
    it('should parse a valid config file', () => {
      const definition = {
        settings: {
          security: {},
        },
      };
      const result = ConfigParser.parse(drivers, definition);
      assert.deepStrictEqual(result[0].Driver.name, 'Security');
    });
    it('should forward the raw config value, not the zod-parsed one with defaults materialized in', () => {
      const definition = { settings: { security: {} } };
      const result = ConfigParser.parse(drivers, definition);
      // security's schema has optional nested objects with array .default([]) fields several levels down;
      // forwarding the parsed output would materialize those into `{ certificateAndKeyManagement: {...} }` etc.
      assert.deepStrictEqual(result[0].value, {});
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
        ConfigParser.parse(drivers, anonymousDefinition);
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
        ConfigParser.parse(drivers, definition);
      }, /Invalid browserforce configuration:[\s\S]*foo/);
    });
    it('should fail parsing a config with an invalid value', () => {
      const definition = {
        settings: {
          densitySettings: { density: 'Roomy' },
        },
      };
      assert.throws(() => {
        ConfigParser.parse(drivers, definition);
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
        ConfigParser.parse(drivers, definition);
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
      assert.doesNotThrow(() => ConfigParser.parse(drivers, definition));
    });

    it('should parse examples/empty.json', () => {
      const definition = JSON.parse(readFileSync('examples/empty.json', 'utf8'));
      assert.doesNotThrow(() => ConfigParser.parse(drivers, definition));
    });

    const fixtures = readdirSync('src/plugins', { recursive: true, encoding: 'utf8' })
      .filter((f) => f.endsWith('.json') && f !== 'schema.json')
      .map((f) => join('src/plugins', f).split('\\').join('/'))
      .filter((f) => !EXCLUDED_FIXTURES.includes(f));

    for (const fixture of fixtures) {
      it(`should parse ${fixture}`, () => {
        const definition = JSON.parse(readFileSync(fixture, 'utf8'));
        assert.doesNotThrow(() => ConfigParser.parse(drivers, definition));
      });
    }

    it('should fail parsing src/plugins/email-deliverability/invalid.json with an enum message', () => {
      const definition = JSON.parse(readFileSync('src/plugins/email-deliverability/invalid.json', 'utf8'));
      assert.throws(() => {
        ConfigParser.parse(drivers, definition);
      }, /emailDeliverability\.accessLevel: /);
    });

    // Minimal positive-path samples for settings keys no fixture on disk happens to exercise
    // (historyTracking, omniChannelSettings, permissionSets, serviceChannels), so every converted
    // plugin schema has at least one proof it accepts real input. The coverage-completeness check
    // below fails loudly if a future plugin is added without either a fixture or a sample here.
    const MINIMAL_SAMPLES: Record<string, unknown> = {
      historyTracking: [{ objectApiName: 'Account', fieldHistoryTracking: [] }],
      omniChannelSettings: { enableStatusBasedCapacityModel: true },
      permissionSets: [{ permissionSetName: 'MyPermissionSet' }],
      serviceChannels: [{ serviceChannelDeveloperName: 'MyServiceChannel' }],
    };

    for (const [key, value] of Object.entries(MINIMAL_SAMPLES)) {
      it(`should parse a minimal ${key} sample`, () => {
        assert.doesNotThrow(() => ConfigParser.parse(drivers, { settings: { [key]: value } }));
      });
    }

    it('given every settings key, when checked against fixtures and minimal samples, then each has positive-path coverage', () => {
      const coveredKeys = new Set(Object.keys(MINIMAL_SAMPLES));
      for (const fixture of ['examples/full.json', 'examples/empty.json', ...fixtures]) {
        const definition = JSON.parse(readFileSync(fixture, 'utf8')) as { settings?: Record<string, unknown> };
        for (const key of Object.keys(definition.settings ?? {})) {
          coveredKeys.add(key);
        }
      }
      const uncovered = Object.keys(schemas).filter((key) => !coveredKeys.has(key));
      assert.deepStrictEqual(uncovered, []);
    });
  });
});
