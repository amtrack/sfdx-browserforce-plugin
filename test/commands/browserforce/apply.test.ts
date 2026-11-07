import assert from 'node:assert';
import { buildSettingResult } from '../../../src/commands/browserforce/apply.js';

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
});
