import assert from 'assert';
import { isRenameNeeded, Picklists, picklistsSchema, type PicklistValuesConfig, renameState } from './index.js';

const field = { metadataType: 'CustomField' as const, metadataFullName: 'Vehicle__c.Features__c' };
const rename: PicklistValuesConfig = { ...field, value: 'Navigation', newApiName: 'Satnav' };
const values = (...entries: Array<[string, string, boolean?]>) =>
  entries.map(([value, label, active = true]) => ({ value, label, active }));

describe('Picklists rename', () => {
  describe('renameState', () => {
    it('should report a value not renamed yet', () => {
      assert.deepStrictEqual(renameState(rename, values(['Navigation', 'Navigation System'], ['Media', 'Media'])), {
        ...rename,
        newApiName: undefined,
        newLabel: 'Navigation System',
      });
    });
    it('should report a renamed value, even inactive', () => {
      assert.deepStrictEqual(renameState(rename, values(['Satnav', 'Satellite Navigation', false])), {
        ...rename,
        value: undefined,
        newLabel: 'Satellite Navigation',
      });
    });
    it('should fail when another value has the new API name', () => {
      assert.throws(
        () => renameState(rename, values(['Navigation', 'Navigation'], ['Satnav', 'Satnav'])),
        /another value has this API name/,
      );
    });
    it('should fail when neither API name exists', () => {
      assert.throws(() => renameState(rename, values(['Media', 'Media'])), /no value has this API name nor "Satnav"/);
    });
  });

  describe('isRenameNeeded', () => {
    it('should rename a value not renamed yet', () => {
      assert.strictEqual(isRenameNeeded({ ...rename, newApiName: undefined, newLabel: 'Navigation' }, rename), true);
    });
    it('should do nothing once renamed, without newLabel', () => {
      assert.strictEqual(isRenameNeeded({ ...rename, value: undefined, newLabel: 'Navigation' }, rename), false);
    });
    it('should do nothing once renamed with the same label', () => {
      const target = { ...rename, newLabel: 'Satellite Navigation' };
      assert.strictEqual(isRenameNeeded({ ...target, value: undefined }, target), false);
    });
    it('should change the label of a renamed value', () => {
      const target = { ...rename, newLabel: 'Satellite Navigation' };
      assert.strictEqual(isRenameNeeded({ ...rename, value: undefined, newLabel: 'Navigation' }, target), true);
    });
  });

  describe('diff', () => {
    it('should keep only the renames still needed', () => {
      const other = { ...field, value: 'AC', newApiName: 'AirCon' };
      const plugin = new Picklists(undefined as never);
      const state = {
        picklistValues: [
          { ...rename, value: undefined, newLabel: 'Navigation' },
          { ...other, newApiName: undefined, newLabel: 'AC' },
        ],
      };
      assert.deepStrictEqual(plugin.diff(state, { picklistValues: [rename, other] }), { picklistValues: [other] });
    });
  });

  describe('schema', () => {
    const errorsOf = (action: object) => {
      const result = picklistsSchema.safeParse({ picklistValues: [{ ...field, ...action }] });
      return result.success ? [] : result.error.issues.map((issue) => issue.path.at(-1));
    };
    it('should accept a rename, with or without newLabel', () => {
      assert.deepStrictEqual(errorsOf({ value: 'A', newApiName: 'B' }), []);
      assert.deepStrictEqual(errorsOf({ value: 'A', newApiName: 'B', newLabel: 'Bee' }), []);
    });
    it('should reject newLabel without newApiName', () => {
      assert.deepStrictEqual(errorsOf({ value: 'A', newLabel: 'Bee' }), ['newLabel']);
    });
    it('should reject newApiName without value, or equal to it', () => {
      assert.deepStrictEqual(errorsOf({ newApiName: 'B' }), ['value']);
      assert.deepStrictEqual(errorsOf({ value: 'A', newApiName: 'A' }), ['newApiName']);
    });
    it('should reject newApiName combined with another action', () => {
      assert.deepStrictEqual(errorsOf({ value: 'A', newApiName: 'B', newValue: 'C', active: false }), [
        'newValue',
        'active',
      ]);
    });
  });
});
