import assert from 'assert';
import { UserAccessPolicies, type UserAccessPoliciesConfig } from './index.js';

const tests: {
  description: string;
  state: UserAccessPoliciesConfig;
  definition: UserAccessPoliciesConfig;
  expected: UserAccessPoliciesConfig | undefined;
}[] = [
  {
    description: 'should run Apply To All when it has not run since the policy changed',
    state: { accessPolicies: [{ apiName: 'Grant_Permissions', applyToAll: false }] },
    definition: { accessPolicies: [{ apiName: 'Grant_Permissions', applyToAll: true }] },
    expected: { accessPolicies: [{ apiName: 'Grant_Permissions', applyToAll: true }] },
  },
  {
    description: 'should not run Apply To All again when it ran since the policy changed',
    state: { accessPolicies: [{ apiName: 'Grant_Permissions', active: true, applyToAll: true }] },
    definition: { accessPolicies: [{ apiName: 'Grant_Permissions', active: true, applyToAll: true }] },
    expected: undefined,
  },
  {
    description: 'should never produce a change for applyToAll false',
    state: { accessPolicies: [{ apiName: 'Grant_Permissions', active: true }] },
    definition: { accessPolicies: [{ apiName: 'Grant_Permissions', active: true, applyToAll: false }] },
    expected: undefined,
  },
  {
    description: 'should not touch the status when active is left out',
    state: { accessPolicies: [{ apiName: 'Grant_Permissions' }] },
    definition: { accessPolicies: [{ apiName: 'Grant_Permissions', on: 'Create' }] },
    expected: undefined,
  },
  {
    description: 'should run only Apply To All when active is left out',
    state: { accessPolicies: [{ apiName: 'Grant_Permissions', applyToAll: false }] },
    definition: { accessPolicies: [{ apiName: 'Grant_Permissions', on: 'Create', applyToAll: true }] },
    expected: { accessPolicies: [{ apiName: 'Grant_Permissions', applyToAll: true }] },
  },
  {
    description: 'should activate then run Apply To All',
    state: { accessPolicies: [{ apiName: 'Grant_Permissions', active: false, applyToAll: false }] },
    definition: { accessPolicies: [{ apiName: 'Grant_Permissions', active: true, on: 'Create', applyToAll: true }] },
    expected: { accessPolicies: [{ apiName: 'Grant_Permissions', active: true, on: 'Create', applyToAll: true }] },
  },
  {
    description: 'should change the status without Apply To All when it already ran',
    state: { accessPolicies: [{ apiName: 'Grant_Permissions', active: true, on: 'Update', applyToAll: true }] },
    definition: { accessPolicies: [{ apiName: 'Grant_Permissions', active: true, on: 'Create', applyToAll: true }] },
    expected: { accessPolicies: [{ apiName: 'Grant_Permissions', active: true, on: 'Create' }] },
  },
  {
    description: 'should deactivate a policy',
    state: { accessPolicies: [{ apiName: 'Grant_Permissions', active: true }] },
    definition: { accessPolicies: [{ apiName: 'Grant_Permissions', active: false }] },
    expected: { accessPolicies: [{ apiName: 'Grant_Permissions', active: false }] },
  },
  {
    description: 'should keep only the policies that change',
    state: {
      accessPolicies: [
        { apiName: 'Grant_Permissions', active: true, on: 'Create' },
        { apiName: 'Additional_Grant_Permissions', active: false },
      ],
    },
    definition: {
      accessPolicies: [
        { apiName: 'Grant_Permissions', active: true, on: 'Create' },
        { apiName: 'Additional_Grant_Permissions', active: true },
      ],
    },
    expected: { accessPolicies: [{ apiName: 'Additional_Grant_Permissions', active: true }] },
  },
];

describe('UserAccessPolicies', () => {
  describe('diff()', () => {
    const p = new UserAccessPolicies(global.browserforce);
    for (const t of tests) {
      it(t.description, () => {
        assert.deepStrictEqual(p.diff(t.state, t.definition), t.expected);
      });
    }
  });
});
