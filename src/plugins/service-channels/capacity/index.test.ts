import assert from 'assert';
import { Capacity, capacitySchema } from './index.js';

describe(Capacity.name, () => {
  const plugin = new Capacity(undefined as never);

  describe('diff', () => {
    it('only switches a status-based channel to tab-based, ignoring the status fields', () => {
      const state = {
        capacityModel: 'StatusBased' as const,
        statusField: 'Case.Status',
        valuesForInProgress: ['Working'],
        checkAgentCapacityOnReopenedWorkItems: true,
        checkAgentCapacityOnReassignedWorkItems: false,
      };
      assert.deepStrictEqual(plugin.diff(state, { capacityModel: 'TabBased' }), { capacityModel: 'TabBased' });
    });
    it('does nothing for a channel that is already tab-based', () => {
      assert.deepStrictEqual(plugin.diff({ capacityModel: 'TabBased' }, { capacityModel: 'TabBased' }), undefined);
    });
    it('ignores the order of the in-progress values', () => {
      const state = {
        capacityModel: 'StatusBased' as const,
        statusField: 'Case.Type',
        valuesForInProgress: ['A', 'B'],
      };
      const definition = { ...state, valuesForInProgress: ['B', 'A'] };
      assert.deepStrictEqual(plugin.diff(state, definition), undefined);
    });
  });

  describe('JSON Schema conditions', () => {
    const meta = capacitySchema.meta() as {
      if: { properties: { capacityModel: { const: string } } };
      else: { if: { properties: { capacityModel: { const: string } } } };
    };
    it('compare the capacity model with the values of its enum', () => {
      const values = capacitySchema.shape.capacityModel.unwrap().options as string[];
      assert.ok(values.includes(meta.if.properties.capacityModel.const));
      assert.ok(values.includes(meta.else.if.properties.capacityModel.const));
    });
  });
});
