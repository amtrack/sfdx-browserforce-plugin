import assert from 'assert';
import { UserAccessPolicies, type UserAccessPoliciesConfig } from './index.js';

const tests: {
  description: string;
  state: UserAccessPoliciesConfig;
  definition: UserAccessPoliciesConfig;
  expected: UserAccessPoliciesConfig | undefined;
}[] = [
  {
    description: 'should run Apply To All when it is true',
    state: { accessPolicies: [{ apiName: 'Grant_Permissions' }] },
    definition: { accessPolicies: [{ apiName: 'Grant_Permissions', applyToAll: true }] },
    expected: { accessPolicies: [{ apiName: 'Grant_Permissions', applyToAll: true }] },
  },
  {
    description: 'should run Apply To All again at each apply, even when the status is already right',
    state: { accessPolicies: [{ apiName: 'Grant_Permissions', active: true }] },
    definition: { accessPolicies: [{ apiName: 'Grant_Permissions', active: true, applyToAll: true }] },
    expected: { accessPolicies: [{ apiName: 'Grant_Permissions', applyToAll: true }] },
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
    state: { accessPolicies: [{ apiName: 'Grant_Permissions' }] },
    definition: { accessPolicies: [{ apiName: 'Grant_Permissions', on: 'Create', applyToAll: true }] },
    expected: { accessPolicies: [{ apiName: 'Grant_Permissions', applyToAll: true }] },
  },
  {
    description: 'should activate then run Apply To All',
    state: { accessPolicies: [{ apiName: 'Grant_Permissions', active: false }] },
    definition: { accessPolicies: [{ apiName: 'Grant_Permissions', active: true, on: 'Create', applyToAll: true }] },
    expected: { accessPolicies: [{ apiName: 'Grant_Permissions', active: true, on: 'Create', applyToAll: true }] },
  },
  {
    description: 'should change the trigger type then run Apply To All',
    state: { accessPolicies: [{ apiName: 'Grant_Permissions', active: true, on: 'Update' }] },
    definition: { accessPolicies: [{ apiName: 'Grant_Permissions', active: true, on: 'Create', applyToAll: true }] },
    expected: { accessPolicies: [{ apiName: 'Grant_Permissions', active: true, on: 'Create', applyToAll: true }] },
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
