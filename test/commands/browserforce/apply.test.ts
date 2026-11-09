import assert from 'node:assert';
import { SfError } from '@salesforce/core';
import { buildSettingResult, withSettingResults } from '../../../src/commands/browserforce/apply.js';
import { settingDocUrl } from '../../../src/docs.js';

describe('BrowserforceApply', () => {
  describe('buildSettingResult()', () => {
    it('should return null changes when no action is necessary', () => {
      assert.deepStrictEqual(buildSettingResult('densitySettings', undefined, true), {
        key: 'densitySettings',
        changes: null,
        applied: false,
      });
    });

    it('should return the planned changes on a dry run', () => {
      assert.deepStrictEqual(buildSettingResult('densitySettings', { density: 'Compact' }, false), {
        key: 'densitySettings',
        changes: { density: 'Compact' },
        applied: false,
      });
    });

    it('should return the applied changes as given, masked values included', () => {
      assert.deepStrictEqual(buildSettingResult('authProviders', { consumerSecret: '****' }, true), {
        key: 'authProviders',
        changes: { consumerSecret: '****' },
        applied: true,
      });
    });
  });

  describe('withSettingResults()', () => {
    const data = {
      dryRun: false,
      settings: [
        { key: 'densitySettings', changes: { density: 'Compact' }, applied: true },
        { key: 'authProviders', changes: { consumerSecret: '****' }, applied: false },
      ],
      failedSetting: 'authProviders',
    };
    const docUrl = settingDocUrl('authProviders');

    it('should keep the message and the cause of an Error and carry the results gathered so far', () => {
      const cause = new Error('root cause');
      const original = new Error('Save failed', { cause });
      const error = withSettingResults(original, data);
      assert.ok(error instanceof SfError);
      assert.strictEqual(error.message, 'Save failed');
      assert.strictEqual(error.cause, cause);
      assert.strictEqual(error.stack, original.stack);
      assert.deepStrictEqual(error.data, { ...data, docUrl });
      assert.deepStrictEqual(error.actions, [`See the documentation of 'authProviders': ${docUrl}`]);
    });

    it('should keep an SfError and merge its data', () => {
      const original = new SfError('Invalid', 'InvalidError', ['Check the config']).setData({ details: 'x' });
      const error = withSettingResults(original, data);
      assert.strictEqual(error, original);
      assert.deepStrictEqual(error.data, { details: 'x', ...data, docUrl });
      assert.deepStrictEqual(error.actions, [
        'Check the config',
        `See the documentation of 'authProviders': ${docUrl}`,
      ]);
    });
  });
});
