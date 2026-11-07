import assert from 'node:assert';
import {
  buildEnvMasking,
  findEnvReferences,
  getEnvReferenceName,
  resolveEnvReferences,
  toMaskingPath,
} from '../src/env-references.js';
import { getPluginJsonSchema } from '../src/plugin-catalog.js';

describe('getEnvReferenceName', () => {
  it('only accepts a value that is exactly ${NAME}', () => {
    assert.strictEqual(getEnvReferenceName('${MY_VAR}'), 'MY_VAR');
    assert.strictEqual(getEnvReferenceName('${_x1}'), '_x1');
    assert.strictEqual(getEnvReferenceName('prefix-${MY_VAR}'), undefined);
    assert.strictEqual(getEnvReferenceName('${1VAR}'), undefined);
    assert.strictEqual(getEnvReferenceName('$MY_VAR'), undefined);
    assert.strictEqual(getEnvReferenceName(true), undefined);
  });
});

describe('findEnvReferences', () => {
  it('finds references in objects and arrays, with their path', () => {
    assert.deepStrictEqual(
      findEnvReferences({
        authProviders: { P: { consumerSecret: '${SECRET}', consumerKey: 'key' } },
        historyTracking: [{ objectApiName: 'Account', enableHistoryTracking: '${TRACK}' }],
      }),
      [
        { name: 'SECRET', path: ['authProviders', 'P', 'consumerSecret'] },
        { name: 'TRACK', path: ['historyTracking', 0, 'enableHistoryTracking'] },
      ],
    );
  });
});

describe('toMaskingPath', () => {
  it('drops the setting key and the array indices', () => {
    assert.strictEqual(toMaskingPath(['customerPortal', 'portals', 0, 'adminUser']), 'portals.adminUser');
    assert.strictEqual(toMaskingPath(['historyTracking', 0, 'objectApiName']), 'objectApiName');
    assert.strictEqual(toMaskingPath(['picklists']), '');
  });

  it('keeps the index of a reference that is a whole array item', () => {
    assert.strictEqual(toMaskingPath(['historyTracking', 0]), '[0]');
    assert.strictEqual(
      toMaskingPath(['security', 'certificateAndKeyManagement', 'certificates', 1]),
      'certificateAndKeyManagement.certificates[1]',
    );
  });
});

describe('buildEnvMasking', () => {
  it('lists per setting the paths and the string values resolved from the environment', () => {
    const resolved = resolveEnvReferences(
      {
        authProviders: { P: { consumerSecret: '${SECRET}' } },
        historyTracking: ['${ITEM}'],
      },
      { SECRET: 's3cret', ITEM: '{"objectApiName":"Secret__c","enableHistoryTracking":true}' },
      getPluginJsonSchema,
    );
    assert.deepStrictEqual(
      buildEnvMasking(resolved),
      new Map([
        ['authProviders', { paths: ['P.consumerSecret'], values: ['s3cret'] }],
        ['historyTracking', { paths: ['[0]'], values: ['Secret__c'] }],
      ]),
    );
  });
});

describe('resolveEnvReferences', () => {
  const resolve = (settings: Record<string, unknown>, env: NodeJS.ProcessEnv) =>
    resolveEnvReferences(settings, env, getPluginJsonSchema);

  it('returns a copy of the settings when there is no reference', () => {
    const settings = { densitySettings: { density: 'Compact' } };
    const result = resolve(settings, {});
    assert.deepStrictEqual(result.settings, settings);
    assert.notStrictEqual(result.settings, settings);
    assert.deepStrictEqual(result.references, []);
  });

  it('keeps an escaped reference as the literal text, without reading the environment', () => {
    const settings = {
      authProviders: { P: { consumerKey: '$${NOT_A_VARIABLE}', consumerSecret: '${SECRET}' } },
      companyInformation: { defaultCurrencyIsoCode: '$${ALSO_LITERAL}' },
    };
    const result = resolve(settings, { SECRET: 's' });
    assert.deepStrictEqual(result.settings, {
      authProviders: { P: { consumerKey: '${NOT_A_VARIABLE}', consumerSecret: 's' } },
      companyInformation: { defaultCurrencyIsoCode: '${ALSO_LITERAL}' },
    });
    assert.deepStrictEqual(
      result.references.map((reference) => reference.name),
      ['SECRET'],
    );
    assert.strictEqual(settings.authProviders.P.consumerKey, '$${NOT_A_VARIABLE}');
    // the caller's object never receives the resolved secret
    assert.strictEqual(settings.authProviders.P.consumerSecret, '${SECRET}');
    assert.deepStrictEqual(resolve({ companyInformation: { defaultCurrencyIsoCode: '$${X}' } }, {}).settings, {
      companyInformation: { defaultCurrencyIsoCode: '${X}' },
    });
  });

  it('converts the values to the type the schema expects', () => {
    const settings = {
      authProviders: { P: { consumerSecret: '${SECRET}' } },
      accountIntelligenceView: { enable: '${ENABLED}' },
      security: { certificateAndKeyManagement: { certificates: [{ name: 'c', label: 'c', keysize: '${SIZE}' }] } },
      historyTracking: '${TRACKING}',
    };
    const result = resolve(settings, {
      SECRET: 's3cret',
      ENABLED: 'TRUE',
      SIZE: '4096',
      TRACKING: '[{"objectApiName":"Account"}]',
    });
    assert.deepStrictEqual(result.settings, {
      authProviders: { P: { consumerSecret: 's3cret' } },
      accountIntelligenceView: { enable: true },
      security: { certificateAndKeyManagement: { certificates: [{ name: 'c', label: 'c', keysize: 4096 }] } },
      historyTracking: [{ objectApiName: 'Account' }],
    });
    // the input is left untouched
    assert.strictEqual(settings.accountIntelligenceView.enable, '${ENABLED}');
  });

  it('lists every unset, empty or unconvertible variable', () => {
    const settings = {
      authProviders: { P: { consumerSecret: '${UNSET}', consumerKey: '${EMPTY}' } },
      accountIntelligenceView: { enable: '${NOT_A_BOOLEAN}' },
    };
    assert.throws(
      () => resolve(settings, { EMPTY: '', NOT_A_BOOLEAN: 'yes' }),
      (err: Error) => {
        assert.match(err.message, /settings\.authProviders\.P\.consumerSecret: environment variable UNSET is not set/);
        assert.match(err.message, /settings\.authProviders\.P\.consumerKey: environment variable EMPTY is not set/);
        assert.match(
          err.message,
          /settings\.accountIntelligenceView\.enable: environment variable NOT_A_BOOLEAN must be true or false/,
        );
        return true;
      },
    );
  });

  it('keeps the text for an unknown setting, so the schema validation reports it', () => {
    const result = resolve({ unknownSetting: { value: '${X}' } }, { X: 'true' });
    assert.deepStrictEqual(result.settings, { unknownSetting: { value: 'true' } });
  });
});
